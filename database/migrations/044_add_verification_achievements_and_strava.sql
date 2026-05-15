ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_achievements TEXT,
  ADD COLUMN IF NOT EXISTS verification_strava_url TEXT;

ALTER TABLE expert_applications
  ADD COLUMN IF NOT EXISTS verification_achievements TEXT,
  ADD COLUMN IF NOT EXISTS verification_strava_url TEXT;
