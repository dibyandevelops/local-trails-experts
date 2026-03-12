import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthFromRequest } from '@/lib/auth';

const STATE_COOKIE = 'mtb_google_oauth_state';
const NEXT_COOKIE = 'mtb_google_oauth_next';
const MODE_COOKIE = 'mtb_google_oauth_mode';
const ROLE_COOKIE = 'mtb_google_oauth_role';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/?login=1&role=participant&message=Google login is not configured', baseUrl)
    );
  }

  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/trails';
  const mode = url.searchParams.get('mode') === 'connect' ? 'connect' : 'login';
  const roleParam = url.searchParams.get('role');
  const role = roleParam === 'expert' ? 'expert' : 'participant';

  if (mode === 'connect') {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== role) {
      return NextResponse.redirect(
        new URL(
          `/?login=1&role=${role}&message=Please sign in as a ${role} to connect Google.`,
          baseUrl
        )
      );
    }
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
  res.cookies.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });
  return res;
}
