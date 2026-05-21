CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  whatsapp_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Nepal',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('org_admin', 'org_editor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id
  ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
  ON organization_members (user_id);

CREATE TABLE IF NOT EXISTS trail_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('built_by', 'verified_by', 'maintained_by')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trail_id, organization_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_trail_org_trail_id
  ON trail_organizations (trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_org_org_id
  ON trail_organizations (organization_id);

ALTER TABLE trails
  ADD COLUMN IF NOT EXISTS last_maintenance_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_status TEXT
    CHECK (maintenance_status IN ('unknown', 'good', 'needs_attention', 'closed'))
    DEFAULT 'unknown';

CREATE TABLE IF NOT EXISTS fundraising_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES trails(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount_npr NUMERIC(12, 2) NOT NULL CHECK (target_amount_npr > 0),
  raised_amount_npr NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (raised_amount_npr >= 0),
  qr_image_url TEXT,
  payment_note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'paused', 'archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_org_id
  ON fundraising_campaigns (organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_trail_id
  ON fundraising_campaigns (trail_id);
CREATE INDEX IF NOT EXISTS idx_campaign_status
  ON fundraising_campaigns (status);

CREATE TABLE IF NOT EXISTS trail_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('shuttle', 'lift', 'support_vehicle')),
  title TEXT NOT NULL,
  description TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_email TEXT,
  price_note TEXT,
  schedule_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trail_services_trail_id
  ON trail_services (trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_services_org_id
  ON trail_services (organization_id);

CREATE TABLE IF NOT EXISTS trail_update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  update_type TEXT NOT NULL CHECK (
    update_type IN (
      'condition_update',
      'maintenance_done',
      'hazard_reported',
      'hazard_cleared',
      'route_changed',
      'metadata_updated'
    )
  ),
  title TEXT NOT NULL,
  details TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trail_update_logs_trail_id
  ON trail_update_logs (trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_update_logs_org_id
  ON trail_update_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_trail_update_logs_created_at
  ON trail_update_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS organization_gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_gallery_org_id
  ON organization_gallery_items (organization_id);

INSERT INTO organizations (
  slug,
  name,
  tagline,
  description,
  city,
  country,
  is_verified,
  is_active
)
VALUES
  (
    'trail-builders-nepal',
    'Trail Builders Nepal',
    'Building and maintaining sustainable mountain trails',
    'Community-led trail building and maintenance with focus on safe, sustainable riding in Nepal.',
    'Kathmandu',
    'Nepal',
    TRUE,
    TRUE
  ),
  (
    'bikefarm-nepal',
    'Bikefarm Nepal',
    'Ride culture and trail support',
    'Supporting riders with local expertise, community rides, and trail ecosystem initiatives.',
    'Kathmandu',
    'Nepal',
    TRUE,
    TRUE
  ),
  (
    'epic-mountain-bike',
    'Epic Mountain Bike',
    'Events, riders, and trail progression',
    'Mountain bike focused community operations, events, and rider support in Nepal.',
    'Kathmandu',
    'Nepal',
    TRUE,
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;
