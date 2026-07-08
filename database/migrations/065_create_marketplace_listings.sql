CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('cycle', 'part', 'accessory')),
  category VARCHAR(40) NOT NULL,
  condition VARCHAR(30) NOT NULL CHECK (condition IN ('excellent', 'good', 'needs_service')),
  price_npr INTEGER NOT NULL CHECK (price_npr >= 0 AND price_npr <= 100000000),
  location VARCHAR(120) NOT NULL,
  fit_label VARCHAR(120),
  description TEXT NOT NULL,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  contact_methods TEXT[] NOT NULL DEFAULT '{whatsapp}',
  contact_value VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'hidden', 'sold', 'deleted')),
  sold_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_contact_methods_valid CHECK (
    contact_methods <@ ARRAY['whatsapp', 'phone', 'email']::TEXT[]
    AND cardinality(contact_methods) = 1
  )
);

CREATE TABLE IF NOT EXISTS marketplace_listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 3),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, sort_order)
);

CREATE TABLE IF NOT EXISTS marketplace_listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(30) NOT NULL CHECK (
    reason IN ('suspected_scam', 'prohibited_item', 'incorrect_details', 'already_sold', 'other')
  ),
  details VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_public_listings
  ON marketplace_listings (created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_marketplace_owner_listings
  ON marketplace_listings (owner_user_id, created_at DESC)
  WHERE status <> 'deleted';

CREATE INDEX IF NOT EXISTS idx_marketplace_listing_type_category
  ON marketplace_listings (listing_type, category, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_marketplace_open_reports
  ON marketplace_listing_reports (created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_marketplace_images_listing
  ON marketplace_listing_images (listing_id, sort_order);

DROP TRIGGER IF EXISTS update_marketplace_listings_updated_at ON marketplace_listings;
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
