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

function normalizeImageUrls(
  primary?: unknown,
  gallery?: unknown
): string[] | undefined {
  const fromGallery = Array.isArray(gallery) ? gallery : [];
  const raw = [primary, ...fromGallery]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const urls = Array.from(
    new Set(
      raw.filter(
        (value) => value.startsWith('https://') || value.startsWith('http://')
      )
    )
  );
  return urls.length > 0 ? urls : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticUrls: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/trails'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/events'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/experts'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/purpose'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/support-locoxperts'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/store-locator'), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const { trails: trailRows, events: eventRows, experts: expertRows } =
      await getPublicSitemapRows();

    const trails = trailRows.map((row) => ({
      url: absoluteUrl(`/trails/${row.id}`),
      lastModified: isoDate(row.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: normalizeImageUrls(row.image_url, row.trail_images),
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
      priority: 0.5,
    }));

    return [...staticUrls, ...trails, ...events, ...experts];
  } catch (error) {
    // Keep sitemap available even if DB is temporarily unreachable.
    console.warn('sitemap: failed to query dynamic URLs', error);
    return staticUrls;
  }
}
