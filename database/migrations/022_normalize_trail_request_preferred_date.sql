-- Ensure preferred_date is stored as DATE (timezone-safe) and normalize existing values.

ALTER TABLE trail_interest_requests
  ALTER COLUMN preferred_date TYPE DATE
  USING preferred_date::date;
