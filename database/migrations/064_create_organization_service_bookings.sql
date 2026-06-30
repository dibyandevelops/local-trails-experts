CREATE TABLE IF NOT EXISTS organization_service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES organization_services(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  participant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_name VARCHAR(255),
  requester_email VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(50),
  preferred_date DATE NOT NULL,
  preferred_time TIME,
  group_size INTEGER NOT NULL DEFAULT 1 CHECK (group_size BETWEEN 1 AND 50),
  quoted_price_npr NUMERIC(12, 2) CHECK (quoted_price_npr IS NULL OR quoted_price_npr >= 0),
  notes TEXT,
  organization_response_note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_organization
  ON organization_service_bookings (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_bookings_participant
  ON organization_service_bookings (participant_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_bookings_service
  ON organization_service_bookings (service_id, preferred_date);
