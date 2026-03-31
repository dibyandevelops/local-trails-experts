ALTER TABLE trail_interest_requests
  ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS offered_price_npr INTEGER,
  ADD COLUMN IF NOT EXISTS nearest_point VARCHAR(255);

