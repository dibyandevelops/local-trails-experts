import type { Metadata } from 'next';
import { Suspense } from 'react';
import CommunityRidesClient from './rides-client';

export const metadata: Metadata = {
  title: 'Community Rides',
  description:
    'LocoXperts Community ride calendar: weekend long rides, biweekly cycling plans, and midweek endurance sessions.',
  alternates: { canonical: '/community-rides' },
};

function CommunityRidesFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`community-rides-fallback-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-5 w-48 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mt-4 h-20 rounded bg-gray-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export default function CommunityRidesPage() {
  return (
    <Suspense fallback={<CommunityRidesFallback />}>
      <CommunityRidesClient />
    </Suspense>
  );
}

