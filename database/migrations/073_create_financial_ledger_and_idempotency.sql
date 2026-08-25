-- Migration: 073_create_financial_ledger_and_idempotency.sql
-- Description: Creates double-entry financial ledger and distributed idempotency tracking tables.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  locked_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'processing', -- 'processing' | 'completed' | 'failed'
  response_code INT,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_locked_until ON idempotency_keys(locked_until);

-- Ledger Accounts representing system asset, liability, and revenue pools
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(64) UNIQUE NOT NULL, -- e.g. 'platform:escrow', 'platform:revenue:booking_fee', 'expert:payable:{userId}'
  account_type VARCHAR(32) NOT NULL, -- 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  holder_id UUID, -- References users(id) or organizations(id) if scoped to an entity
  currency VARCHAR(3) NOT NULL DEFAULT 'NPR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_holder ON ledger_accounts(holder_id);

-- Ledger Transactions grouping balanced journal entries
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref VARCHAR(128) UNIQUE NOT NULL, -- e.g. 'tx:esewa:UUID', 'tx:manual:PAYMENT_ID'
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Balanced double-entry postings (Every transaction must have Sum(debit) == Sum(credit))
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
  entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);
