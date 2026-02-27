CREATE TABLE IF NOT EXISTS trail_interest_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requester_name VARCHAR(255),
  requester_email VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trail_interest_requests_trail_id
  ON trail_interest_requests(trail_id);
