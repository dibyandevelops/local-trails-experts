import type { MetadataRoute } from 'next';
import pool from '@/lib/db';
import { absoluteUrl } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function isoDate(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticUrls: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/trails'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/events'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/experts'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/purpose'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/sponsors'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/donate'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const [trailsResult, eventsResult, expertsResult] = await Promise.all([
      pool.query(
        `
        SELECT id, updated_at
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

    const trails = (trailsResult.rows || []).map((row: any) => ({
      url: absoluteUrl(`/trails/${row.id}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const events = (eventsResult.rows || []).map((row: any) => ({
      url: absoluteUrl(`/events/${row.id}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    const experts = (expertsResult.rows || []).map((row: any) => ({
      url: absoluteUrl(`/experts/${row.id}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

    return [...staticUrls, ...trails, ...events, ...experts];
  } catch (error) {
    // Keep sitemap available even if DB is temporarily unreachable.
    console.warn('sitemap: failed to query dynamic URLs', error);
    return staticUrls;
  }
}
