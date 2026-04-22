import type { Metadata } from 'next';
import TrailsClient from './trails-client';
import { hasAnySearchParams, listingMetadata } from '@/lib/seo-listing';
import { absoluteUrl } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

export async function generateMetadata(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = props.searchParams ? await props.searchParams : {};
  const hasFilters = hasAnySearchParams(resolved);
  return listingMetadata({
    title: 'Trails in Nepal',
    description:
      'Browse mountain bike, hiking, running, and cycling trails across Nepal with maps, safety details, and local insights.',
    canonicalPath: '/trails',
    hasFilters,
  });
}

export default function TrailsPage() {
  const collectionJsonLd = jsonLdStringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Trails in Nepal',
    url: absoluteUrl('/trails'),
    description:
      'Explore curated trails across Nepal with route details, safety information, and local recommendations.',
  });

  const breadcrumbJsonLd = jsonLdStringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Trails', item: absoluteUrl('/trails') },
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: collectionJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <TrailsClient />
    </>
  );
}
