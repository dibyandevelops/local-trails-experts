import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  fetchStravaAthlete,
  fetchStravaAthleteStats,
  refreshStravaToken,
} from '@/lib/strava';

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const expertId = params.id;
    if (!expertId) {
      return NextResponse.json({ error: 'Expert id is required' }, { status: 400 });
    }

    const auth = getAuthFromRequest(request);

    const result = await pool.query(
      `
      SELECT id, role, strava_athlete_id, strava_access_token, strava_refresh_token,
             strava_token_expires_at, strava_profile, strava_stats, strava_synced_at
      FROM users
      WHERE id = $1 AND role = 'expert'
      LIMIT 1
    `,
      [expertId]
    );

    const expert = result.rows[0];
    if (!expert) {
      return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
    }

    const isSelf = auth?.sub === expertId && auth?.role === 'expert';
    let profile = expert.strava_profile;
    let stats = expert.strava_stats;
    let syncedAt = expert.strava_synced_at;
    let connected = Boolean(expert.strava_athlete_id);

    // If the owner is viewing and token is available, attempt a lightweight refresh/sync.
    if (isSelf && expert.strava_refresh_token && expert.strava_athlete_id) {
      const expiresAt = expert.strava_token_expires_at
        ? new Date(expert.strava_token_expires_at).getTime()
        : 0;
      let accessToken = expert.strava_access_token;
      let refreshToken = expert.strava_refresh_token;
      let tokenExpiresAt = expert.strava_token_expires_at;

      if (!accessToken || expiresAt < Date.now() + 60 * 1000) {
        const refreshed = await refreshStravaToken(expert.strava_refresh_token);
        accessToken = refreshed.access_token;
        refreshToken = refreshed.refresh_token;
        tokenExpiresAt = new Date(refreshed.expires_at * 1000).toISOString();
      }

      try {
        const [athleteProfile, athleteStats] = await Promise.all([
          fetchStravaAthlete(accessToken),
          fetchStravaAthleteStats(accessToken, Number(expert.strava_athlete_id)),
        ]);
        profile = athleteProfile;
        stats = athleteStats;
        syncedAt = new Date().toISOString();

        await pool.query(
          `
            UPDATE users
            SET strava_access_token = $1,
                strava_refresh_token = $2,
                strava_token_expires_at = $3,
                strava_profile = $4::jsonb,
                strava_stats = $5::jsonb,
                strava_synced_at = NOW(),
                updated_at = NOW()
            WHERE id = $6
          `,
          [
            accessToken,
            refreshToken,
            tokenExpiresAt,
            JSON.stringify(profile || {}),
            JSON.stringify(stats || {}),
            expertId,
          ]
        );
      } catch (error) {
        console.warn('Strava sync failed while reading expert profile', error);
      }
    }

    if (!isSelf) {
      return NextResponse.json(
        { connected: false, profile: null, stats: null, syncedAt: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        connected,
        profile: profile || null,
        stats: stats || null,
        syncedAt: syncedAt || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expert Strava data:', error);
    return NextResponse.json({ error: 'Failed to fetch Strava data' }, { status: 500 });
  }
}
