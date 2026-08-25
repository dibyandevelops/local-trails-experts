import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { buildStravaAuthorizeUrl, getStravaConfig } from '@/lib/strava';
import { STRAVA_ENABLED } from '@/lib/feature-flags';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'strava-auth-start', 15, 60);
  if (limited) return limited;
  try {
    if (!STRAVA_ENABLED) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const auth = getAuthFromRequest(request);
    const modeParam = request.nextUrl.searchParams.get('mode');
    const mode: 'connect' | 'login' = modeParam === 'login' ? 'login' : 'connect';
    const { clientId, clientSecret, redirectUri } = getStravaConfig();

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Strava OAuth is not configured on the server.' },
        { status: 500 }
      );
    }

    if (mode === 'connect') {
      if (!auth || auth.role !== 'expert') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    const state = randomBytes(24).toString('hex');
    const authorizeUrl = buildStravaAuthorizeUrl(state, mode);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set('strava_oauth_state', `${mode}:${state}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Failed to start Strava OAuth:', error);
    return NextResponse.redirect(new URL('/login?error=strava_oauth_start', request.url));
  }
}
