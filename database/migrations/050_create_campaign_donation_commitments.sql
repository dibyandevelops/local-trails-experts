CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS campaign_donation_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES fundraising_campaigns(id) ON DELETE CASCADE,
  supporter_name TEXT,
  supporter_email TEXT,
  amount_npr NUMERIC(12, 2) NOT NULL CHECK (amount_npr > 0),
  paid_amount_npr NUMERIC(12, 2) CHECK (paid_amount_npr IS NULL OR paid_amount_npr > 0),
  message TEXT,
  wants_progress_updates BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_reference TEXT,
  proof_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'proof_submitted'
    CHECK (status IN ('pledged', 'proof_submitted', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_donation_commitments_campaign_id
  ON campaign_donation_commitments (campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_donation_commitments_status
  ON campaign_donation_commitments (status);
