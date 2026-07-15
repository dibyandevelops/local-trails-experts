'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { SportType } from '@/types';

const EventForm = dynamic(() => import('@/components/feature-components/event-form/event-form'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[360px] place-items-center rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      Loading event form...
    </div>
  ),
});

export default function CreateEventPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'edit' ? 'edit' : 'create';
  const editEventId = searchParams.get('id');
  const prefillTrailId = searchParams.get('trail_id') || '';
  const prefillSport = (searchParams.get('sport') || '') as SportType | '';
  const requestedByName = searchParams.get('requested_by_name') || '';
  const requestedByEmail = searchParams.get('requested_by_email') || '';
  const requestedDate = searchParams.get('requested_date') || '';
  const requestedTime = searchParams.get('requested_time') || '';
  const requestedOfferNpr = searchParams.get('requested_offer_npr') || '';
  const requestedNearestPoint = searchParams.get('requested_nearest_point') || '';
  const requestedTrailRequestId = searchParams.get('trail_request_id') || '';
  const lockTrailAndSport = Boolean(requestedTrailRequestId);

  return (
    <EventForm
      mode={mode}
      editEventId={editEventId}
      prefillTrailId={prefillTrailId}
      prefillSport={prefillSport}
      lockTrailAndSport={lockTrailAndSport}
      requestedByName={requestedByName}
      requestedByEmail={requestedByEmail}
      requestedDate={requestedDate}
      requestedTime={requestedTime}
      requestedOfferNpr={requestedOfferNpr}
      requestedNearestPoint={requestedNearestPoint}
      requestedTrailRequestId={requestedTrailRequestId}
    />
  );
}
