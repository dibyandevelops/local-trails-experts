ALTER TABLE expert_ride_programs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expert_ride_programs_organization
  ON expert_ride_programs (organization_id, is_active, created_at DESC);
