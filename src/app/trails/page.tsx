import type { Metadata } from 'next';
import TrailsClient from './trails-client';
import { hasAnySearchParams, listingMetadata } from '@/lib/seo-listing';

export async function generateMetadata(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = props.searchParams ? await props.searchParams : {};
  const hasFilters = hasAnySearchParams(resolved);
  return listingMetadata({
    title: 'Trails',
    description: 'Browse trails, routes, and local recommendations.',
    canonicalPath: '/trails',
    hasFilters,
  });
}

export default function TrailsPage() {
  return <TrailsClient />;
}

