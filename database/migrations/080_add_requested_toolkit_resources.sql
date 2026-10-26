-- Add the requested cycling and outdoor tools to the curated directory.
INSERT INTO community_resources (
  title, slug, description, category, sport_type, pricing_type, price_note,
  external_url, is_verified_by_locoxperts, is_featured, platforms, tags, display_order
) VALUES
(
  'Veloi', 'veloi',
  'An AI cycling coach that connects with Strava to review training load, power and heart-rate trends, and help plan workouts. Coaching is informational and not medical advice.',
  'app', 'mtb', 'freemium', 'Free tier; optional Pro subscription',
  'https://www.veloi.app/', true, false,
  '["web", "ios", "android"]'::jsonb,
  '["cycling coach", "Strava", "training", "recovery"]'::jsonb, 10
),
(
  'Recover Athletics', 'recover-athletics',
  'A Strava-connected prehab and recovery app with guided routines intended to help athletes address common aches and support injury prevention.',
  'app', 'mtb', 'freemium', 'Integrated with Strava; availability and plan terms may vary',
  'https://recoverathletics.com/', true, false,
  '["ios", "android"]'::jsonb,
  '["recovery", "prehab", "mobility", "Strava"]'::jsonb, 11
),
(
  'Relive', 'relive',
  'Track outdoor activities or connect a compatible tracker, then turn rides and hikes into shareable stories with animated 3D route videos.',
  'app', 'all', 'freemium', 'Free features; optional Relive Plus subscription',
  'https://www.relive.com/app', true, false,
  '["ios", "android", "web"]'::jsonb,
  '["ride tracking", "3D video", "activity stories", "cycling"]'::jsonb, 12
),
(
  'LastBar', 'lastbar',
  'An offline-capable, community-built mobile signal coverage map. It can help riders check where a phone may have coverage along a route; coverage reports are crowdsourced and may be incomplete or out of date.',
  'app', 'all', 'freemium', 'Free core features; optional one-time Pro purchase on Android',
  'https://play.google.com/store/apps/details?id=agency.clc.lastbar', true, false,
  '["android"]'::jsonb,
  '["mobile coverage", "offline", "remote routes", "safety planning"]'::jsonb, 13
),
(
  'AR AlpineGuide', 'ar-alpineguide',
  'An augmented-reality mountain identification app that labels nearby peaks and offers a 3D terrain view. Use it as orientation support alongside maps and local conditions.',
  'app', 'hiking', 'freemium', 'Free with ads and optional in-app purchase',
  'https://play.google.com/store/apps/details?id=com.chuna0.ARYamaNaviU', true, false,
  '["ios", "android"]'::jsonb,
  '["mountain identification", "augmented reality", "peaks", "3D terrain"]'::jsonb, 14
),
(
  'Leaderboard', 'leaderboard-y11k',
  'A Strava-connected platform for creating and joining activity leaderboards, comparing progress, and reviewing rankings and activity trends.',
  'app', 'all', 'freemium', 'Free sign-up; some features require a paid plan',
  'https://leaderboard.y11k.com/', true, false,
  '["web"]'::jsonb,
  '["leaderboards", "Strava", "activity tracking", "community"]'::jsonb, 15
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
  platforms = EXCLUDED.platforms,
  tags = EXCLUDED.tags,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
