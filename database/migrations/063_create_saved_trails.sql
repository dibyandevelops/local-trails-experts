CREATE TABLE IF NOT EXISTS saved_trails (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trail_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_trails_user_created
  ON saved_trails (user_id, created_at DESC);
