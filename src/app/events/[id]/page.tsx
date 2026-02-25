'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking, Event } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const { data: user = null } = useCurrentUser();
  const [booking, setBooking] = useState<(Booking & { payment_status?: string | null }) | null>(null);
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

  useEffect(() => {
    if (!eventId || !user || user.role !== 'participant') return;
    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/bookings`);
        const data = await res.json();
        setBooking(data.booking || null);
      } catch {
        setBooking(null);
      }
    };
    fetchBooking();
  }, [eventId, user]);

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

      <div className="mt-4 flex flex-wrap gap-2">
        {event.host_user_id && (
          <button
            type="button"
            onClick={() => router.push(`/experts/${event.host_user_id}`)}
            className="inline-flex items-center rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            View Expert Profile
          </button>
        )}
        {event.trail?.id && (
          <button
            type="button"
            onClick={() => router.push(`/trails/${event.trail?.id}`)}
            className="inline-flex items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Open Trail Map
          </button>
        )}
      </div>

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

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
        <p className="mt-1 text-sm text-gray-600">
          Price per spot: NPR {event.price_npr || 0}
        </p>
        {user?.role === 'participant' && (
          <div className="mt-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                booking?.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {booking?.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        )}
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">QR Payment Placeholder</p>
          <p className="text-xs text-gray-500 mt-1">
            Scan QR to pay. Payment confirmation integration will be enabled next.
          </p>
          {event.qr_image_url ? (
            <img
              src={event.qr_image_url}
              alt="Event QR payment"
              className="mt-3 h-40 w-40 rounded border border-gray-200 bg-white object-contain"
            />
          ) : (
            <div className="mt-3 h-40 w-40 rounded border border-gray-200 bg-white grid place-items-center text-xs text-gray-400">
              No QR uploaded
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
