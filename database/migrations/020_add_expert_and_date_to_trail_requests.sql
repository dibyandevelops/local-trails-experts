ALTER TABLE trail_interest_requests
  ADD COLUMN IF NOT EXISTS assigned_expert_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_date DATE;

CREATE INDEX IF NOT EXISTS idx_trail_interest_requests_assigned_expert_user_id
  ON trail_interest_requests(assigned_expert_user_id);

CREATE INDEX IF NOT EXISTS idx_trail_interest_requests_preferred_date
  ON trail_interest_requests(preferred_date);

