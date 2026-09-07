-- Migration 077: Create community resources and tools directory table
CREATE TABLE IF NOT EXISTS community_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'app', 'hardware_tool', 'youtube_channel', 'weather_safety', 'community_group'
  sport_type VARCHAR(50) DEFAULT 'all', -- 'all', 'mtb', 'hiking', 'bikepacking'
  pricing_type VARCHAR(20) DEFAULT 'free', -- 'free', 'freemium', 'paid', 'subscription'
  price_note VARCHAR(150), -- e.g. 'Free basic, $30/yr for offline 3D maps'
  external_url TEXT NOT NULL,
  icon_or_logo_url TEXT,
  youtube_handle_or_channel_id VARCHAR(100),
  is_verified_by_locoxperts BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  platforms JSONB DEFAULT '["web"]'::jsonb, -- e.g. ["ios", "android", "garmin", "web"]
  tags JSONB DEFAULT '[]'::jsonb, -- e.g. ["offline maps", "3D contours", "Himalayas"]
  metadata JSONB DEFAULT '{}'::jsonb, -- dynamic fields like subscriber count, developer, hardware weight
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_resources_category ON community_resources(category);
CREATE INDEX IF NOT EXISTS idx_community_resources_sport ON community_resources(sport_type);
CREATE INDEX IF NOT EXISTS idx_community_resources_featured ON community_resources(is_featured);
CREATE INDEX IF NOT EXISTS idx_community_resources_order ON community_resources(display_order);

-- Seed high-value initial toolkit resources for MTB and Hiking in Nepal
INSERT INTO community_resources (
  title, slug, description, category, sport_type, pricing_type, price_note,
  external_url, youtube_handle_or_channel_id, is_verified_by_locoxperts, is_featured,
  platforms, tags, display_order
) VALUES
(
  'Gaia GPS',
  'gaia-gps',
  'The gold standard for backcountry topographic offline navigation. Offers OpenCycleMap, satellite imagery, and slope angle shading indispensable for remote Nepal trails.',
  'app',
  'all',
  'freemium',
  'Free basic tracking, $40/yr for offline layers',
  'https://www.gaiagps.com',
  NULL,
  true,
  true,
  '["ios", "android", "web"]'::jsonb,
  '["offline maps", "topography", "gps", "himalayas"]'::jsonb,
  1
),
(
  'OsmAnd Maps & Navigation',
  'osmand-maps',
  '100% offline OpenStreetMap viewer with high-detail elevation contour lines and mountain peak data across Nepal without needing cellular reception.',
  'app',
  'all',
  'freemium',
  'Free (up to 7 map downloads), Paid Unlimited',
  'https://osmand.net',
  NULL,
  true,
  true,
  '["ios", "android"]'::jsonb,
  '["offline maps", "open-source", "remote navigation"]'::jsonb,
  2
),
(
  'Windy.com Weather Radar',
  'windy-weather-radar',
  'Essential mountain weather intelligence. Shows ECMWF and GFS high-altitude wind forecasts, cloud base heights, and precipitation tracking for safe ridge passes.',
  'weather_safety',
  'all',
  'free',
  'Free full web & mobile radar, optional Pro subscription',
  'https://www.windy.com',
  NULL,
  true,
  true,
  '["ios", "android", "web"]'::jsonb,
  '["weather radar", "monsoon tracking", "wind models", "safety"]'::jsonb,
  3
),
(
  'Global Mountain Bike Network (GMBN)',
  'gmbn-youtube',
  'The premier YouTube resource for mountain biking tutorials, technical riding body positions, gear reviews, and trail maintenance advice.',
  'youtube_channel',
  'mtb',
  'free',
  'Free YouTube content',
  'https://www.youtube.com/@gmbn',
  '@gmbn',
  true,
  true,
  '["web", "ios", "android"]'::jsonb,
  '["tutorials", "skills", "bike setup", "reviews"]'::jsonb,
  4
),
(
  'Park Tool Tech Guides',
  'park-tool-youtube',
  'Definitive bicycle mechanical repair guides covering derailleur tuning, hydraulic brake bleeding, tubeless repair, and emergency trailside fixes.',
  'youtube_channel',
  'mtb',
  'free',
  'Free YouTube repair guides',
  'https://www.youtube.com/@parktool',
  '@parktool',
  true,
  true,
  '["web", "ios", "android"]'::jsonb,
  '["bike repair", "mechanics", "maintenance", "emergency fix"]'::jsonb,
  5
),
(
  'Nepal DHM Weather & Flood Warning',
  'nepal-dhm-weather',
  'Official Government of Nepal Department of Hydrology & Meteorology real-time river level gauges, flood alerts, and national radar updates.',
  'weather_safety',
  'all',
  'free',
  'Free public government portal',
  'http://hydrology.gov.np',
  NULL,
  true,
  false,
  '["web"]'::jsonb,
  '["nepal official", "flood alert", "river crossing", "monsoon safety"]'::jsonb,
  6
),
(
  'Trailforks',
  'trailforks',
  'Crowdsourced mountain bike trail database featuring user condition reports, trail elevation profiles, and trail association support.',
  'app',
  'mtb',
  'freemium',
  'Free 1 home region, subscription for global offline',
  'https://www.trailforks.com',
  NULL,
  true,
  false,
  '["ios", "android", "garmin", "web"]'::jsonb,
  '["trail database", "mtb routes", "condition reports"]'::jsonb,
  7
),
(
  'Tubeless Tire Plug Kit (Bacon Strips) & Co2',
  'tubeless-tire-plug-kit',
  'Critical trailside repair tool for sharp Himalayan shale and thorn punctures without removing the bike wheel or losing tubeless sealant.',
  'hardware_tool',
  'mtb',
  'paid',
  '~$10 - $25 at local cycle shops',
  'https://en.wikipedia.org/wiki/Tubeless_tire',
  NULL,
  true,
  false,
  '["gear"]'::jsonb,
  '["trailside fix", "flat repair", "emergency kit"]'::jsonb,
  8
),
(
  'Sawyer Squeeze Micro Water Filter',
  'sawyer-squeeze-filter',
  'Ultralight 0.1 micron water purifier for drinking safely from Himalayan streams and remote village tap points without carrying heavy extra bottles.',
  'hardware_tool',
  'all',
  'paid',
  '~$35 - $45',
  'https://sawyer.com/products/sawyer-micro-squeeze-water-filtration-system/',
  NULL,
  true,
  false,
  '["gear"]'::jsonb,
  '["hydration", "water purification", "bikepacking", "trekking"]'::jsonb,
  9
)
ON CONFLICT (slug) DO NOTHING;
