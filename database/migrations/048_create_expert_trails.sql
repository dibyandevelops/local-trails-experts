CREATE TABLE IF NOT EXISTS expert_trails (
  expert_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (expert_user_id, trail_id)
);

CREATE INDEX IF NOT EXISTS idx_expert_trails_expert_user_id
  ON expert_trails (expert_user_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expert_trails_trail_id
  ON expert_trails (trail_id);
