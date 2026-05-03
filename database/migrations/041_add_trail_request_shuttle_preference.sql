ALTER TABLE trail_interest_requests
ADD COLUMN IF NOT EXISTS needs_paid_shuttle BOOLEAN NOT NULL DEFAULT FALSE;

