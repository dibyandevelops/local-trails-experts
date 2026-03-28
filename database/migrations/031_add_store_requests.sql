CREATE TABLE IF NOT EXISTS store_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  city text NOT NULL,
  location text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  contact_name text,
  contact_email text,
  phone text,
  services text,
  website text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests (status);
