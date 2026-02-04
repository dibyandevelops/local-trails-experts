'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Event } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (!res.ok) {
          setEvent(null);
          return;
        }
        setEvent(data.event || null);
      } catch (error) {
        console.error('Error loading event', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return <div className="text-gray-600">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Event not found.</p>
        <button
          type="button"
          onClick={() => router.push('/events')}
          className="inline-flex px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
        >
          Back to events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/events" className="text-xs text-green-700 hover:underline">
        ← Back to events
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-2">{event.title}</h1>
      <p className="text-sm text-gray-600 mt-1">
        {format(new Date(event.event_date), 'PPP p')}
        {event.city ? ` • ${event.city}` : ''}
      </p>

      <div className="mt-6 space-y-3 text-sm text-gray-700">
        {event.description && <p>{event.description}</p>}
        {event.meeting_point && (
          <p>
            <span className="font-semibold">Meeting point:</span>{' '}
            {event.meeting_point}
          </p>
        )}
        {event.sport_type && (
          <p>
            <span className="font-semibold">Sport:</span> {event.sport_type}
          </p>
        )}
        {event.required_expertise && (
          <p>
            <span className="font-semibold">Required expertise:</span>{' '}
            {event.required_expertise}
          </p>
        )}
        {event.organizer_name && (
          <p>
            <span className="font-semibold">Organizer:</span>{' '}
            {event.organizer_name}
          </p>
        )}
        {event.organizer_email && (
          <p>
            <span className="font-semibold">Organizer email:</span>{' '}
            {event.organizer_email}
          </p>
        )}
      </div>
    </div>
  );
}
