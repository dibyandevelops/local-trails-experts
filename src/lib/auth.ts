import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types';

export const AUTH_COOKIE_NAME = 'mtb_auth';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET (or NEXTAUTH_SECRET) env var.');
  }
  return secret;
}

function base64UrlEncode(input: string | Buffer) {
  const base64 = Buffer.isBuffer(input)
    ? input.toString('base64')
    : Buffer.from(input).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = 4 - (padded.length % 4 || 4);
  const normalized = padded + '='.repeat(padLength % 4);
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function sign(data: string, secret: string) {
  const signature = createHmac('sha256', secret).update(data).digest();
  return base64UrlEncode(signature);
}

export function signAuthToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>) {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(data, secret);

  return `${data}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const secret = getJwtSecret();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(data, secret);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_SECONDS,
    path: '/',
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}

export function getAuthFromRequest(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export function createTempPassword() {
  return randomBytes(8).toString('hex');
}
