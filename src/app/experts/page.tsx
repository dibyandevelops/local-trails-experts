import type { Metadata } from 'next';
import ExpertsClient from './experts-client';
import { hasAnySearchParams, listingMetadata } from '@/lib/seo-listing';

export async function generateMetadata(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = props.searchParams ? await props.searchParams : {};
  const hasFilters = hasAnySearchParams(resolved);
  return listingMetadata({
    title: 'Experts',
    description: 'Browse verified local experts and their hosted adventures.',
    canonicalPath: '/experts',
    hasFilters,
  });
}

export default function ExpertsPage() {
  return <ExpertsClient />;
}

