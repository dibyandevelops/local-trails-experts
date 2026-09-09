-- Migration 078: Add Strava and Komoot to community resources toolkit
INSERT INTO community_resources (
  title, slug, description, category, sport_type, pricing_type, price_note,
  external_url, youtube_handle_or_channel_id, is_verified_by_locoxperts, is_featured,
  platforms, tags, display_order
) VALUES
(
  'Strava',
  'strava',
  'The premier social fitness tracking platform for athletes. Track GPS rides and hikes, analyze elevation gains, compete on local Nepal segments, and automatically sync your GPX activities directly into LocoXperts.',
  'app',
  'all',
  'freemium',
  'Free GPS tracking, ~$12/mo or $80/yr for detailed segment analysis & route planning',
  'https://www.strava.com',
  NULL,
  true,
  true,
  '["ios", "android", "garmin", "apple-watch", "web"]'::jsonb,
  '["gps tracking", "segments", "cycling", "running", "social", "stats"]'::jsonb,
  3
),
(
  'Komoot',
  'komoot',
  'Top-rated route planning and outdoor navigation app for cycling and hiking. Features smart surface-aware routing (singletrack vs. gravel vs. paved road), voice navigation, and turn-by-turn guidance for backcountry adventures.',
  'app',
  'all',
  'freemium',
  'Free first region, one-off unlocked maps or World Pack ($30)',
  'https://www.komoot.com',
  NULL,
  true,
  true,
  '["ios", "android", "garmin", "wahoo", "web"]'::jsonb,
  '["route planner", "turn-by-turn", "surface types", "offline maps", "gravel", "bikepacking"]'::jsonb,
  4
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sport_type = EXCLUDED.sport_type,
  pricing_type = EXCLUDED.pricing_type,
  price_note = EXCLUDED.price_note,
  external_url = EXCLUDED.external_url,
  is_verified_by_locoxperts = EXCLUDED.is_verified_by_locoxperts,
  is_featured = EXCLUDED.is_featured,
  platforms = EXCLUDED.platforms,
  tags = EXCLUDED.tags,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
