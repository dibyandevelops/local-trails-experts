CREATE TABLE IF NOT EXISTS ride_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'ride_note'
    CHECK (category IN ('trail_guide', 'expert_note', 'ride_report', 'safety', 'trail_work', 'ride_note')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trail_id UUID REFERENCES trails(id) ON DELETE SET NULL,
  expert_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_notes_status_published
  ON ride_notes(status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_ride_notes_trail
  ON ride_notes(trail_id);

CREATE INDEX IF NOT EXISTS idx_ride_notes_expert
  ON ride_notes(expert_user_id);
