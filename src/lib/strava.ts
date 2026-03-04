import { getServerEnv } from '@/lib/env.server';

const STRAVA_OAUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_URL = 'https://www.strava.com/api/v3';

export type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  athlete: {
    id: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    profile?: string | null;
    city?: string | null;
    country?: string | null;
    email?: string | null;
  };
};

export function getStravaConfig() {
  const env = getServerEnv();
  return {
    clientId: process.env.STRAVA_CLIENT_ID || '',
    clientSecret: process.env.STRAVA_CLIENT_SECRET || '',
    redirectUri: process.env.STRAVA_REDIRECT_URI || '',
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    env,
  };
}

export function buildStravaAuthorizeUrl(state: string, mode: 'connect' | 'login') {
  const { clientId, redirectUri } = getStravaConfig();
  const url = new URL(STRAVA_OAUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope', mode === 'connect' ? 'read,activity:read_all' : 'read');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeStravaToken(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getStravaConfig();
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Strava token exchange failed: ${text || response.statusText}`);
  }
  return response.json();
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getStravaConfig();
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Strava token refresh failed: ${text || response.statusText}`);
  }
  return response.json();
}

export async function fetchStravaAthlete(accessToken: string) {
  const response = await fetch(`${STRAVA_API_URL}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Strava athlete: ${text || response.statusText}`);
  }
  return response.json();
}

export async function fetchStravaAthleteStats(accessToken: string, athleteId: number) {
  const response = await fetch(`${STRAVA_API_URL}/athletes/${athleteId}/stats`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Strava stats: ${text || response.statusText}`);
  }
  return response.json();
}
