CREATE TABLE IF NOT EXISTS platform_subscription_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  payment_qr_image_url TEXT,
  payment_note TEXT,
  is_payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_subscription_settings (id, payment_note, is_payment_enabled)
VALUES (
  TRUE,
  'Scan the QR, pay from your wallet or bank app, then upload the payment screenshot for admin review.',
  FALSE
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_platform_subscription_settings_updated_at ON platform_subscription_settings;
CREATE TRIGGER update_platform_subscription_settings_updated_at
  BEFORE UPDATE ON platform_subscription_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
