ALTER TABLE users
  ADD COLUMN IF NOT EXISTS strava_athlete_id BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS strava_access_token TEXT,
  ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS strava_token_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS strava_scope TEXT,
  ADD COLUMN IF NOT EXISTS strava_profile JSONB,
  ADD COLUMN IF NOT EXISTS strava_stats JSONB,
  ADD COLUMN IF NOT EXISTS strava_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_strava_athlete_id ON users(strava_athlete_id);
