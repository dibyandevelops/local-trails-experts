'use client';

import { useSearchParams } from 'next/navigation';
import EventForm from '@/components/feature-components/event-form/event-form';
import { SportType } from '@/types';

export default function CreateEventPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'edit' ? 'edit' : 'create';
  const editEventId = searchParams.get('id');
  const prefillTrailId = searchParams.get('trail_id') || '';
  const prefillSport = (searchParams.get('sport') || '') as SportType | '';
  const requestedByName = searchParams.get('requested_by_name') || '';
  const requestedByEmail = searchParams.get('requested_by_email') || '';
  const requestedDate = searchParams.get('requested_date') || '';

  return (
    <EventForm
      mode={mode}
      editEventId={editEventId}
      prefillTrailId={prefillTrailId}
      prefillSport={prefillSport}
      requestedByName={requestedByName}
      requestedByEmail={requestedByEmail}
      requestedDate={requestedDate}
    />
  );
}
