import type { MetadataRoute } from 'next';
import { getPublicSitemapRows } from '@/lib/data/public-sitemap';
import { absoluteUrl } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function isoDate(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function normalizeImageUrls(
  ...items: unknown[]
): string[] | undefined {
  const flattened: string[] = [];

  for (const item of items) {
    if (!item) continue;
    if (Array.isArray(item)) {
      for (const nested of item) {
        if (typeof nested === 'string' && nested.trim()) {
          flattened.push(nested.trim());
        }
      }
    } else if (typeof item === 'string' && item.trim()) {
      flattened.push(item.trim());
    }
  }

  const urls = Array.from(
    new Set(
      flattened
        .map((value) => {
          if (value.startsWith('https://') || value.startsWith('http://')) {
            return value;
          }
          if (value.startsWith('/')) {
            return absoluteUrl(value);
          }
          return null;
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  return urls.length > 0 ? urls : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticUrls: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/home'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/trails'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/events'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/ride-notes'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/experts'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/organizations'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/help'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/updates'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/purpose'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/support-locoxperts'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/store-locator'), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const {
      trails: trailRows,
      events: eventRows,
      experts: expertRows,
      rideNotes: rideNoteRows,
      organizations: orgRows,
    } = await getPublicSitemapRows();

    // Use canonical slug when available to avoid Next.js redirects in Google Search Console
    const trails = trailRows.map((row) => ({
      url: absoluteUrl(`/trails/${encodeURIComponent(row.slug || row.id)}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: normalizeImageUrls(row.image_url, row.trail_images),
    }));

    const rideNotes = rideNoteRows.map((row) => ({
      url: absoluteUrl(`/ride-notes/${encodeURIComponent(row.slug)}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: normalizeImageUrls(row.image_url),
    }));

    const organizations = orgRows.map((row) => ({
      url: absoluteUrl(`/organizations/${encodeURIComponent(row.slug)}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: normalizeImageUrls(row.image_url),
    }));

    const events = eventRows.map((row) => ({
      url: absoluteUrl(`/events/${row.id}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    const experts = expertRows.map((row) => ({
      url: absoluteUrl(`/experts/${row.id}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    return [...staticUrls, ...trails, ...rideNotes, ...organizations, ...events, ...experts];
  } catch (error) {
    console.warn('sitemap: failed to query dynamic URLs', error);
    return staticUrls;
  }
}
