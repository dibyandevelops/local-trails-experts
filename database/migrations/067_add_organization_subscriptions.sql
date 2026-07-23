ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'cancelled'));

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_plan_check
  CHECK (subscription_plan IN ('free', 'starter', 'partner', 'pro'));

ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

UPDATE marketplace_listings listing
SET organization_id = owned_org.id
FROM organizations owned_org
WHERE listing.organization_id IS NULL
  AND owned_org.owner_user_id = listing.owner_user_id
  AND owned_org.is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_organization_listings
  ON marketplace_listings (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
  ON organizations (subscription_status, subscription_expires_at);
