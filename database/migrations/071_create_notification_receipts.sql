CREATE TABLE IF NOT EXISTS notification_receipts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_updated
  ON notification_receipts (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_notification_receipts_updated_at ON notification_receipts;
CREATE TRIGGER update_notification_receipts_updated_at
  BEFORE UPDATE ON notification_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
