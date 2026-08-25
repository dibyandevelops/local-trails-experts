import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const STATE_COOKIE = 'mtb_google_oauth_state';
const NEXT_COOKIE = 'mtb_google_oauth_next';
const MODE_COOKIE = 'mtb_google_oauth_mode';
const ROLE_COOKIE = 'mtb_google_oauth_role';

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/trails';
  }
  return value;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'google-auth-start', 15, 60);
  if (limited) return limited;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/?login=1&message=Google login is not configured', baseUrl)
    );
  }

  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get('next'));
  const rawMode = url.searchParams.get('mode');
  const mode =
    rawMode === 'connect' || rawMode === 'register' ? rawMode : 'login';
  const roleParam = url.searchParams.get('role');
  let role =
    roleParam === 'admin' ? 'admin' : roleParam === 'expert' ? 'expert' : 'participant';

  if (mode === 'connect') {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.redirect(
        new URL(
          '/?login=1&message=Please sign in to connect Google.',
          baseUrl
        )
      );
    }
    role = auth.role;
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  res.cookies.set(NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  res.cookies.set(MODE_COOKIE, mode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  res.cookies.set(ROLE_COOKIE, mode === 'connect' ? role : '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  return res;
}
