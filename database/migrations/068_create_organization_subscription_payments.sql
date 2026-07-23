CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organization_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_npr NUMERIC(12, 2) NOT NULL CHECK (amount_npr > 0),
  months INTEGER NOT NULL DEFAULT 1 CHECK (months BETWEEN 1 AND 12),
  transaction_reference TEXT,
  proof_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_subscription_payments_org
  ON organization_subscription_payments (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_subscription_payments_status
  ON organization_subscription_payments (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_subscription_payments_one_pending
  ON organization_subscription_payments (organization_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_organization_subscription_payments_updated_at
  ON organization_subscription_payments;

CREATE TRIGGER update_organization_subscription_payments_updated_at
  BEFORE UPDATE ON organization_subscription_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
