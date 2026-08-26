import 'server-only';
import pool from '@/lib/db';

export type SitemapTrailRow = {
  id: string;
  slug: string | null;
  updated_at: Date | string | null;
  image_url: string | null;
  trail_images: unknown;
};

export type SitemapEntityRow = {
  id: string;
  updated_at: Date | string | null;
};

export type SitemapSlugRow = {
  slug: string;
  updated_at: Date | string | null;
  image_url?: string | null;
};

export async function getPublicSitemapRows() {
  const [trailsResult, eventsResult, expertsResult, rideNotesResult, organizationsResult] =
    await Promise.all([
      pool.query(
        `
        SELECT id, slug, updated_at, image_url, trail_images
        FROM trails
        WHERE status = 'approved' AND COALESCE(is_hidden, FALSE) = FALSE
        ORDER BY updated_at DESC
        LIMIT 5000
        `
      ),
      pool.query(
        `
        SELECT id, updated_at
        FROM events
        WHERE event_date >= NOW() - INTERVAL '180 days'
        ORDER BY updated_at DESC
        LIMIT 5000
        `
      ),
      pool.query(
        `
        SELECT id, updated_at
        FROM users
        WHERE role = 'expert' AND is_verified_expert = TRUE AND COALESCE(is_hidden, FALSE) = FALSE
        ORDER BY updated_at DESC
        LIMIT 5000
        `
      ),
      pool.query(
        `
        SELECT slug, updated_at, cover_image_url AS image_url
        FROM ride_notes
        WHERE status = 'published'
        ORDER BY updated_at DESC
        LIMIT 5000
        `
      ),
      pool.query(
        `
        SELECT slug, updated_at, logo_url AS image_url
        FROM organizations
        WHERE is_active = TRUE
        ORDER BY updated_at DESC
        LIMIT 5000
        `
      ),
    ]);

  return {
    trails: trailsResult.rows as SitemapTrailRow[],
    events: eventsResult.rows as SitemapEntityRow[],
    experts: expertsResult.rows as SitemapEntityRow[],
    rideNotes: rideNotesResult.rows as SitemapSlugRow[],
    organizations: organizationsResult.rows as SitemapSlugRow[],
  };
}
