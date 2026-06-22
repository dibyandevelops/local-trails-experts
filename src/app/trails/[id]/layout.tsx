import type { Metadata } from 'next';
import { getTrailSeo } from '@/lib/data/public-trails';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

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
    const previewImage = image ? absoluteUrl(image) : absoluteUrl(DEFAULT_OG_IMAGE_PATH);

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
        images: [{ url: previewImage, width: 1200, height: 630, alt: trail.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [previewImage],
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
  let trail: Awaited<ReturnType<typeof getTrailSeo>>;
  try {
    trail = await getTrailSeo(id);
  } catch {
    trail = null;
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
