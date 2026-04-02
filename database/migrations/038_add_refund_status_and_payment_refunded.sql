-- Add explicit refund lifecycle fields and allow refunded payment status.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(120),
  ADD COLUMN IF NOT EXISTS refund_gateway_payload JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_refund_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_refund_status_check
      CHECK (refund_status IN ('none', 'requested', 'settled', 'failed'));
  END IF;
END $$;

DO $$
DECLARE
  existing_constraint_name text;
BEGIN
  SELECT conname
  INTO existing_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status IN (''pending'', ''paid'', ''failed''%';

  IF existing_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', existing_constraint_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_status_check'
      AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

