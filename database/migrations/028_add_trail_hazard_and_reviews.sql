ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS is_hazardous BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hazard_note TEXT,
  ADD COLUMN IF NOT EXISTS hazard_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hazard_updated_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS trail_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trail_reviews_unique
  ON trail_reviews (trail_id, reviewer_user_id);

CREATE INDEX IF NOT EXISTS idx_trail_reviews_trail_id
  ON trail_reviews (trail_id);

CREATE TABLE IF NOT EXISTS expert_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expert_reviews_unique
  ON expert_reviews (expert_user_id, reviewer_user_id);

CREATE INDEX IF NOT EXISTS idx_expert_reviews_expert_id
  ON expert_reviews (expert_user_id);
