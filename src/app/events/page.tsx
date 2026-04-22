import { Suspense } from 'react';
import EventsPageClient from './events-client';
import type { Metadata } from 'next';
import { hasAnySearchParams, listingMetadata } from '@/lib/seo-listing';

function EventsPageFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`events-fallback-${index}`}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="mb-3 h-6 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mb-4 h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mb-3 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-800" />
            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="h-4 w-4/6 rounded bg-gray-200 dark:bg-slate-800" />
          </div>
          <div className="mb-4 h-20 rounded-lg bg-gray-200 dark:bg-slate-800" />
          <div className="h-10 w-full rounded bg-gray-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsPageFallback />}>
      <EventsPageClient />
    </Suspense>
  );
}

export async function generateMetadata(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = props.searchParams ? await props.searchParams : {};
  const hasFilters = hasAnySearchParams(resolved);
  return listingMetadata({
    title: 'MTB & Trail Events in Nepal',
    description:
      'Join upcoming mountain bike and trail events in Nepal hosted by local experts and communities.',
    canonicalPath: '/events',
    hasFilters,
    keywords: [
      'MTB events Nepal',
      'cycling events Kathmandu',
      'trail rides Nepal',
      'bike community events Nepal',
      'local guided rides Nepal',
    ],
  });
}
