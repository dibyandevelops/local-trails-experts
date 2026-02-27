import { Suspense } from 'react';
import EventsPageClient from './events-client';

function EventsPageFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`events-fallback-${index}`}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="mb-3 h-6 w-2/3 rounded bg-gray-200" />
          <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
          <div className="mb-3 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-4/6 rounded bg-gray-200" />
          </div>
          <div className="mb-4 h-20 rounded-lg bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-200" />
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
