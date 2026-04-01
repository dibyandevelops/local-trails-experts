import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthFromRequest } from '@/lib/auth';

const STATE_COOKIE = 'mtb_facebook_oauth_state';
const NEXT_COOKIE = 'mtb_facebook_oauth_next';
const MODE_COOKIE = 'mtb_facebook_oauth_mode';

export async function GET(request: NextRequest) {
  const clientId = process.env.FACEBOOK_APP_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/?login=1&message=Facebook login is not configured', baseUrl)
    );
  }

  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/trails';
  const rawMode = url.searchParams.get('mode');
  const mode =
    rawMode === 'connect' || rawMode === 'register' ? rawMode : 'login';

  if (mode === 'connect') {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.redirect(
        new URL('/?login=1&message=Please sign in to connect Facebook.', baseUrl)
      );
    }
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'email,public_profile');
  authUrl.searchParams.set('state', state);

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
  return res;
}
