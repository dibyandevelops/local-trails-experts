import { NextRequest, NextResponse } from 'next/server';
import { STRAVA_ENABLED } from '@/lib/feature-flags';

// Backward-compatibility bridge:
// Some Strava app configs use /exchange_token as callback.
// We forward those callbacks to the real OAuth handler.
export async function GET(request: NextRequest) {
  if (!STRAVA_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const callbackUrl = new URL('/api/strava/callback', request.url);
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const scope = request.nextUrl.searchParams.get('scope');
  const error = request.nextUrl.searchParams.get('error');

  if (code) callbackUrl.searchParams.set('code', code);
  if (state) callbackUrl.searchParams.set('state', state);
  if (scope) callbackUrl.searchParams.set('scope', scope);
  if (error) callbackUrl.searchParams.set('error', error);

  return NextResponse.redirect(callbackUrl);
}
