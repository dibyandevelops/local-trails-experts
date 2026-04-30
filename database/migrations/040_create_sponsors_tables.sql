CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'custom')),
  logo_url TEXT,
  agenda TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'custom')),
  company_logo_url TEXT,
  agenda TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors (is_active);
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_status ON sponsor_requests (status);

INSERT INTO sponsors (company_name, tier, agenda, website_url, is_active)
VALUES
  ('Himal Trail Gear', 'gold', 'Supporting trail mapping and seasonal route safety signage in Nepal.', 'https://example.com', TRUE),
  ('Ride Nepal Collective', 'silver', 'Backing local ride events and beginner skill sessions.', 'https://example.com', TRUE),
  ('Everest Bike Works', 'bronze', 'Helping maintain route data quality and community awareness.', 'https://example.com', TRUE)
ON CONFLICT DO NOTHING;

