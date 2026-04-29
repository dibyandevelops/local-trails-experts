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
    title: 'Best MTB Trails in Nepal',
    description:
      'Discover mountain bike trails in Nepal with GPX maps, route details, safety notes, and local recommendations.',
    canonicalPath: '/trails',
    hasFilters,
    keywords: [
      'best MTB trails in Nepal',
      'mountain bike trails Nepal',
      'Nepal bike trail map',
      'Nepal trail discovery',
      'local trail guides Nepal',
      'Nepal cycling routes',
      'trail GPX Nepal',
    ],
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/home') },
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
