import 'server-only';
import pool from '@/lib/db';

export type SitemapTrailRow = {
  id: string;
  updated_at: Date | string | null;
  image_url: string | null;
  trail_images: unknown;
};

export type SitemapEntityRow = {
  id: string;
  updated_at: Date | string | null;
};

export async function getPublicSitemapRows() {
  const [trailsResult, eventsResult, expertsResult] = await Promise.all([
    pool.query(
      `
      SELECT id, updated_at, image_url, trail_images
      FROM trails
      WHERE status = 'approved' AND is_hidden = FALSE
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
      WHERE role = 'expert' AND is_verified_expert = TRUE
      ORDER BY updated_at DESC
      LIMIT 5000
      `
    ),
  ]);

  return {
    trails: trailsResult.rows as SitemapTrailRow[],
    events: eventsResult.rows as SitemapEntityRow[],
    experts: expertsResult.rows as SitemapEntityRow[],
  };
}
