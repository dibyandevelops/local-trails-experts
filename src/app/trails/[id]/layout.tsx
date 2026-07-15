import { getTrailSeo } from '@/lib/data/public-trails';
import { absoluteUrl } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

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
