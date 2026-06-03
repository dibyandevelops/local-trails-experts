DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'fundraising_campaigns'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE fundraising_campaigns DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE fundraising_campaigns
    ADD CONSTRAINT fundraising_campaigns_status_check
    CHECK (status IN ('draft', 'active', 'looking_for_funds', 'completed', 'paused', 'archived'));
END $$;
