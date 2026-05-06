import type { Metadata } from 'next';
import pool from '@/lib/db';
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

async function getTrailSeo(id: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      slug,
      name,
      description,
      location,
      latitude,
      longitude,
      difficulty,
      sport_type,
      image_url,
      trail_images,
      updated_at
    FROM trails
    WHERE (slug = $1 OR id::text = $1)
      AND status = 'approved'
      AND is_hidden = FALSE
    ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END
    LIMIT 1
    `,
    [id]
  );
  return result.rows[0] as
    | {
        id: string;
        slug: string | null;
        name: string;
        description: string | null;
        location: string;
        latitude: number | null;
        longitude: number | null;
        difficulty: string;
        sport_type: string | null;
        image_url: string | null;
        trail_images: string[] | null;
        updated_at: Date | string | null;
      }
    | undefined;
}

export async function generateMetadata(
  _props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await _props.params;
  try {
    const trail = await getTrailSeo(id);
    if (!trail) {
      return {
        title: `Trail not found`,
        robots: { index: false, follow: false },
      };
    }

    const slug = trail.slug || trail.id;
    const title = `${trail.name} — Nepal Trail Guide`;
    const description =
      (trail.description || '').trim() ||
      `Explore ${trail.name} in ${trail.location}.`;
    const image =
      trail.image_url || (Array.isArray(trail.trail_images) ? trail.trail_images[0] : null);

    return {
      title,
      description,
      keywords: [
        `${trail.name} trail`,
        `${trail.location} mountain bike trail`,
        `${trail.sport_type || 'mtb'} trail Nepal`,
        'Nepal trail guide',
        'MTB trails Nepal',
      ],
      alternates: { canonical: `/trails/${slug}` },
      robots: { index: true, follow: true },
      openGraph: {
        title,
        description,
        url: `/trails/${slug}`,
        siteName: SITE_NAME,
        type: 'article',
        images: image ? [{ url: image, alt: trail.name }] : undefined,
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {
      title: 'Trail',
      description: DEFAULT_DESCRIPTION,
      alternates: { canonical: `/trails/${id}` },
      robots: { index: false, follow: false },
    };
  }
}

export default async function TrailLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  let trail: Awaited<ReturnType<typeof getTrailSeo>> | undefined;
  try {
    trail = await getTrailSeo(id);
  } catch {
    trail = undefined;
  }

  const trailPath = `/trails/${trail?.slug || trail?.id || id}`;
  const trailUrl = absoluteUrl(trailPath);
  const image =
    trail?.image_url || (Array.isArray(trail?.trail_images) ? trail?.trail_images[0] : null);
  const jsonLdTrail =
    trail &&
    jsonLdStringify({
      '@context': 'https://schema.org',
      '@type': 'Place',
      additionalType: 'https://schema.org/SportsActivityLocation',
      name: trail.name,
      description: trail.description || undefined,
      url: trailUrl,
      image: image || undefined,
      geo:
        typeof trail.latitude === 'number' && typeof trail.longitude === 'number'
          ? { '@type': 'GeoCoordinates', latitude: trail.latitude, longitude: trail.longitude }
          : undefined,
      address: trail.location ? { '@type': 'PostalAddress', addressLocality: trail.location } : undefined,
    });
  const jsonLdBreadcrumb =
    trail &&
    jsonLdStringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Trails', item: absoluteUrl('/trails') },
        { '@type': 'ListItem', position: 3, name: trail.name, item: trailUrl },
      ],
    });

  return (
    <>
      {jsonLdTrail && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdTrail }}
        />
      )}
      {jsonLdBreadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdBreadcrumb }}
        />
      )}
      {props.children}
    </>
  );
}
