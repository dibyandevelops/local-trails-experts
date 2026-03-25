'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking, Event } from '@/types';
import DateText from '@/components/ui/date-text';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel } from '@/services/constants/sports';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelEvent } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const { data: user = null } = useCurrentUser();
  const [booking, setBooking] = useState<(Booking & { payment_status?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelEvent(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      if (eventId) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.byId(eventId) });
      }
      router.push('/events');
    },
  });

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
    setRiskAcknowledged(false);
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

  const canCancel =
    user?.role === 'admin' || (user?.role === 'expert' && user?.id === event.host_user_id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 p-6 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/60 dark:via-slate-950/70 dark:to-emerald-900/40">
        <Link
          href="/events"
          className="text-xs font-semibold uppercase tracking-wide text-emerald-700 hover:underline dark:text-emerald-200"
        >
          ← Back to events
        </Link>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {event.title}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              <DateText value={event.event_date} pattern="PPP p" />
              {event.city ? ` • ${event.city}` : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.sport_type && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                  {getSportLabel(event.sport_type)}
                </span>
              )}
              {event.difficulty && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                  {event.difficulty}
                </span>
              )}
              {event.required_expertise && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm dark:bg-emerald-900/60 dark:text-emerald-100">
                  {event.required_expertise}
                </span>
              )}
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm dark:bg-amber-900/60 dark:text-amber-100">
                {event.price_npr && event.price_npr > 0
                  ? `NPR ${event.price_npr}`
                  : 'Free'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {event.host_user_id && (
              <button
                type="button"
                onClick={() => router.push(`/experts/${event.host_user_id}`)}
                className="inline-flex items-center rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                View Expert Profile
              </button>
            )}
            {event.trail?.id && (
              <button
                type="button"
                onClick={() => router.push(`/trails/${event.trail?.id}`)}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
              >
                Open Trail Map
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  if (!eventId) return;
                  const confirmed = window.confirm('Cancel this event? This action cannot be undone.');
                  if (!confirmed) return;
                  cancelMutation.mutate(eventId);
                }}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Event Overview
          </h2>
          <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-slate-200">
            {event.description ? (
              <p className="leading-relaxed">{event.description}</p>
            ) : (
              <p className="text-gray-500 dark:text-slate-400">
                No description added yet. Reach out to the organizer for more details.
              </p>
            )}
            {event.trail && (
              <div className="flex flex-wrap gap-2">
                {event.trail.distance_km && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-900/60 dark:text-blue-100">
                    Distance: {event.trail.distance_km} km
                  </span>
                )}
                {event.trail.elevation_gain_m && (
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-900 dark:bg-purple-900/60 dark:text-purple-100">
                    Elevation gain: {event.trail.elevation_gain_m} m
                  </span>
                )}
                {event.trail.estimated_time_hours && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900 dark:bg-orange-900/60 dark:text-orange-100">
                    Estimated time: {event.trail.estimated_time_hours} h
                  </span>
                )}
              </div>
            )}
            {event.meeting_point && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="font-semibold">Meeting point:</span> {event.meeting_point}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      event.meeting_point
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
              Organizer
            </h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-slate-200">
              <p className="font-semibold text-gray-900 dark:text-white">
                {event.organizer_name || 'LocoXperts'}
              </p>
              {event.organizer_email && <p>{event.organizer_email}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
              Payment
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Price per spot: NPR {event.price_npr || 0}
            </p>
            {user?.role === 'participant' && (
              <div className="mt-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    booking?.payment_status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                  }`}
                >
                  {booking?.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            )}
            {event.price_npr && event.price_npr > 0 && (
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <input
                    type="checkbox"
                    checked={riskAcknowledged}
                    onChange={(event) => setRiskAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span>
                    I acknowledge outdoor activities involve risk and I agree to follow the
                    expert’s safety instructions.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!riskAcknowledged}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white opacity-60"
                  title="Payment flow will be enabled soon"
                >
                  Continue to payment (coming soon)
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
