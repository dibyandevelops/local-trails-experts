ALTER TABLE expert_applications
  ADD COLUMN IF NOT EXISTS reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expert_applications_reviewed_by_admin_id
  ON expert_applications (reviewed_by_admin_id);
