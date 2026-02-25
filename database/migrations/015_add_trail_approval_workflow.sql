ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS approved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_trails_status ON trails(status);
CREATE INDEX IF NOT EXISTS idx_trails_submitted_by ON trails(submitted_by_user_id);
