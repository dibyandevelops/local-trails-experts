import { Suspense } from 'react';
import EventsPageClient from './events-client';

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-600">Loading events...</div>}>
      <EventsPageClient />
    </Suspense>
  );
}
