CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organization_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT,
  cta_label VARCHAR(80),
  cta_url TEXT,
  image_url TEXT,
  starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_promotions_one_active_month
  ON organization_promotions (organization_id, date_trunc('month', starts_at::timestamp))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_org_promotions_public
  ON organization_promotions (organization_id, is_active, starts_at DESC);

DROP TRIGGER IF EXISTS update_organization_promotions_updated_at ON organization_promotions;
CREATE TRIGGER update_organization_promotions_updated_at
  BEFORE UPDATE ON organization_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
