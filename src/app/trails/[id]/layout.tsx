import type { Metadata } from 'next';
import pool from '@/lib/db';
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

async function getTrailSeo(id: string) {
  const result = await pool.query(
    `
    SELECT id, name, description, location, latitude, longitude, difficulty, sport_type, updated_at
    FROM trails
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );
  return result.rows[0] as
    | {
        id: string;
        name: string;
        description: string | null;
        location: string;
        latitude: number | null;
        longitude: number | null;
        difficulty: string;
        sport_type: string | null;
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

    const title = `${trail.name} — Trail`;
    const description =
      (trail.description || '').trim() ||
      `Explore ${trail.name} in ${trail.location}.`;

    return {
      title,
      description,
      alternates: { canonical: `/trails/${trail.id}` },
      openGraph: {
        title,
        description,
        url: `/trails/${trail.id}`,
        siteName: SITE_NAME,
        type: 'article',
      },
      twitter: { title, description },
    };
  } catch {
    return {
      title: 'Trail',
      description: DEFAULT_DESCRIPTION,
      alternates: { canonical: `/trails/${id}` },
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

  const trailUrl = absoluteUrl(`/trails/${id}`);
  const jsonLd =
    trail &&
    jsonLdStringify({
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: trail.name,
      description: trail.description || undefined,
      url: trailUrl,
      geo:
        typeof trail.latitude === 'number' && typeof trail.longitude === 'number'
          ? { '@type': 'GeoCoordinates', latitude: trail.latitude, longitude: trail.longitude }
          : undefined,
      address: trail.location ? { '@type': 'PostalAddress', addressLocality: trail.location } : undefined,
    });

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {props.children}
    </>
  );
}

