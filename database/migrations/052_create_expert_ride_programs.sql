CREATE TABLE IF NOT EXISTS expert_ride_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  price_npr INTEGER,
  max_group_size INTEGER NOT NULL DEFAULT 4 CHECK (max_group_size > 0 AND max_group_size <= 50),
  duration_note VARCHAR(120),
  meeting_point_note VARCHAR(255),
  skill_level VARCHAR(20) NOT NULL DEFAULT 'intermediate'
    CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (expert_user_id, trail_id, title)
);

CREATE INDEX IF NOT EXISTS idx_expert_ride_programs_expert
  ON expert_ride_programs (expert_user_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expert_ride_programs_trail
  ON expert_ride_programs (trail_id, is_active);

CREATE TABLE IF NOT EXISTS expert_ride_program_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES expert_ride_programs(id) ON DELETE CASCADE,
  expert_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requester_name VARCHAR(255),
  requester_email VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(50),
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(20),
  group_size INTEGER NOT NULL DEFAULT 1 CHECK (group_size > 0 AND group_size <= 50),
  offered_price_npr INTEGER,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_ride_program_requests_expert
  ON expert_ride_program_requests (expert_user_id, status, preferred_date);

CREATE INDEX IF NOT EXISTS idx_expert_ride_program_requests_requester
  ON expert_ride_program_requests (requester_user_id, status, preferred_date);

CREATE INDEX IF NOT EXISTS idx_expert_ride_program_requests_program
  ON expert_ride_program_requests (program_id, preferred_date);
