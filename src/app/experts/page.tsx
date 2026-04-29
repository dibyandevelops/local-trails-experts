import type { Metadata } from 'next';
import ExpertsClient from './experts-client';
import { hasAnySearchParams, listingMetadata } from '@/lib/seo-listing';

export async function generateMetadata(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = props.searchParams ? await props.searchParams : {};
  const hasFilters = hasAnySearchParams(resolved);
  return listingMetadata({
    title: 'Local MTB & Trail Experts in Nepal',
    description:
      'Browse verified local experts in Nepal for mountain biking, trail rides, and outdoor coaching.',
    canonicalPath: '/experts',
    hasFilters,
    keywords: [
      'MTB guides Nepal',
      'local bike experts Nepal',
      'mountain biking coach Nepal',
      'trail experts Nepal',
      'Nepal cycling community experts',
    ],
  });
}

export default function ExpertsPage() {
  return <ExpertsClient />;
}
