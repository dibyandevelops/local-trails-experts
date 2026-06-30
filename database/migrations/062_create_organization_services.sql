CREATE TABLE IF NOT EXISTS organization_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(40) NOT NULL CHECK (
    category IN (
      'ride_photography',
      'shuttle_transport',
      'creative_design',
      'guiding',
      'training',
      'bike_rental',
      'repair_support',
      'event_support',
      'other'
    )
  ),
  title VARCHAR(160) NOT NULL,
  description TEXT,
  price_npr NUMERIC(12, 2) CHECK (price_npr IS NULL OR price_npr >= 0),
  price_note VARCHAR(160),
  location VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website_url TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, title)
);

CREATE INDEX IF NOT EXISTS idx_organization_services_public
  ON organization_services (is_active, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_services_organization
  ON organization_services (organization_id, is_active, created_at DESC);
