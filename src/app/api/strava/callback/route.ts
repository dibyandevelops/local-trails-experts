import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  AUTH_HINT_COOKIE_NAME,
  createTempPassword,
  getAuthFromRequest,
  setAuthCookie,
  signAuthToken,
} from '@/lib/auth';
import {
  exchangeStravaToken,
  fetchStravaAthlete,
  fetchStravaAthleteStats,
} from '@/lib/strava';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const returnedState = request.nextUrl.searchParams.get('state') || '';
    const providerError = request.nextUrl.searchParams.get('error');
    const stateCookie = request.cookies.get('strava_oauth_state')?.value || '';

    if (providerError) {
      return NextResponse.redirect(new URL('/login?error=strava_denied', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=strava_missing_code', request.url));
    }

    const [modeFromCookie, stateFromCookie] = stateCookie.split(':');
    const mode: 'connect' | 'login' = modeFromCookie === 'login' ? 'login' : 'connect';

    if (!stateFromCookie || !returnedState || stateFromCookie !== returnedState) {
      return NextResponse.redirect(new URL('/login?error=strava_state_mismatch', request.url));
    }

    const tokenData = await exchangeStravaToken(code);
    const athlete = await fetchStravaAthlete(tokenData.access_token);
    const athleteId = Number(athlete?.id || tokenData.athlete?.id || 0);
    if (!athleteId) {
      return NextResponse.redirect(new URL('/login?error=strava_missing_athlete', request.url));
    }

    let athleteStats: any = null;
    try {
      athleteStats = await fetchStravaAthleteStats(tokenData.access_token, athleteId);
    } catch (error) {
      console.warn('Strava stats fetch failed; continuing without stats.', error);
    }

    const auth = getAuthFromRequest(request);
    const athleteEmail = athlete?.email || tokenData.athlete?.email || null;
    const athleteEmailSafe =
      athleteEmail || `strava-${athleteId}@localguides.invalid`;
    const athleteName =
      [athlete?.firstname, athlete?.lastname].filter(Boolean).join(' ').trim() ||
      tokenData.athlete?.username ||
      'Strava Expert';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let userRow: any = null;
      if (mode === 'connect') {
        if (!auth || auth.role !== 'expert') {
          await client.query('ROLLBACK');
          return NextResponse.redirect(new URL('/login?error=strava_connect_auth', request.url));
        }
        const currentUserRes = await client.query(
          'SELECT id, email, role FROM users WHERE id = $1 LIMIT 1',
          [auth.sub]
        );
        userRow = currentUserRes.rows[0];
      } else {
        const byAthlete = await client.query(
          'SELECT id, email, role FROM users WHERE strava_athlete_id = $1 LIMIT 1',
          [athleteId]
        );
        userRow = byAthlete.rows[0] || null;

        if (!userRow && athleteEmail) {
          const byEmail = await client.query(
            'SELECT id, email, role FROM users WHERE email = $1 LIMIT 1',
            [athleteEmail]
          );
          userRow = byEmail.rows[0] || null;
        }

        if (!userRow) {
          const passwordHash = await bcrypt.hash(createTempPassword(), 10);
          const inserted = await client.query(
            `
              INSERT INTO users (name, email, password_hash, role, city, sports, is_verified_expert)
              VALUES ($1, $2, $3, 'expert', $4, $5::jsonb, FALSE)
              RETURNING id, email, role
            `,
            [
              athleteName,
              athleteEmailSafe,
              passwordHash,
              athlete?.city || null,
              JSON.stringify(['training']),
            ]
          );
          userRow = inserted.rows[0];
        } else if (userRow.role !== 'expert') {
          await client.query('ROLLBACK');
          return NextResponse.redirect(new URL('/login?error=strava_expert_only', request.url));
        }
      }

      await client.query(
        `
          UPDATE users
          SET strava_athlete_id = $1,
              strava_access_token = $2,
              strava_refresh_token = $3,
              strava_token_expires_at = to_timestamp($4),
              strava_scope = $5,
              strava_profile = $6::jsonb,
              strava_stats = $7::jsonb,
              strava_synced_at = NOW(),
              updated_at = NOW()
          WHERE id = $8
        `,
        [
          athleteId,
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_at,
          request.nextUrl.searchParams.get('scope') || null,
          JSON.stringify(athlete || tokenData.athlete || {}),
          athleteStats ? JSON.stringify(athleteStats) : null,
          userRow.id,
        ]
      );

      await client.query('COMMIT');

      const token = signAuthToken({
        sub: userRow.id,
        role: 'expert',
        email: userRow.email,
      });
      const redirectTo =
        mode === 'connect'
          ? new URL('/experts/me?strava=connected', request.url)
          : new URL(`/experts/${userRow.id}?strava=connected`, request.url);
      const response = NextResponse.redirect(redirectTo);
      response.cookies.set('strava_oauth_state', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
      });
      setAuthCookie(response, token);
      response.cookies.set(AUTH_HINT_COOKIE_NAME, '1', {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Strava OAuth callback failed:', error);
    return NextResponse.redirect(new URL('/login?error=strava_callback_failed', request.url));
  }
}
