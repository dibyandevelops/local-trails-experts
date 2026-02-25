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

  const handleCreateBooking = async () => {
    if (!eventId) return;
    setBookingMessage(null);
    setBookingLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBookingMessage(data.error || 'Failed to create booking');
        return;
      }
      setBooking(data.booking);
      setBookingMessage(
        data.booking?.status === 'confirmed'
          ? 'Booking confirmed.'
          : 'Booking created. Payment is pending.'
      );
    } catch {
      setBookingMessage('Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking?.id) return;
    if (!window.confirm('Cancel this booking? Refund depends on cancellation policy.')) return;
    setBookingMessage(null);
    setBookingLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setBookingMessage(data.error || 'Failed to cancel booking');
        return;
      }
      setBooking(data.booking);
      setBookingMessage(`Booking cancelled. Refund NPR: ${data.refund_npr ?? 0}`);
    } catch {
      setBookingMessage('Failed to cancel booking');
    } finally {
      setBookingLoading(false);
    }
  };

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

      {user?.role === 'participant' && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Booking</h2>
          <p className="mt-1 text-sm text-gray-600">
            Price per spot: NPR {event.price_npr || 0}
          </p>

          {!booking || booking.status === 'cancelled' ? (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Spots
                </label>
                <input
                  type="number"
                  min={1}
                  value={spots}
                  onChange={(e) => setSpots(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={bookingLoading}
                onClick={handleCreateBooking}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {bookingLoading ? 'Processing...' : 'Book Event'}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p>
                Status: <span className="font-semibold capitalize">{booking.status}</span>
              </p>
              <p>Total: NPR {booking.total_price_npr}</p>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={bookingLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {bookingLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          )}

          {booking?.id && (
            <div className="mt-3">
              <Link
                href={`/api/bookings/${booking.id}/receipt`}
                target="_blank"
                className="text-sm text-green-700 hover:underline"
              >
                View receipt
              </Link>
            </div>
          )}

          {bookingMessage && (
            <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {bookingMessage}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
