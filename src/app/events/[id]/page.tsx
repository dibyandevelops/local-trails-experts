'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Booking, Event } from '@/types';
import DateText from '@/components/ui/date-text';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel } from '@/services/constants/sports';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelEvent, leaveEvent } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { calculateRefund, getCancellationPolicy } from '@/lib/booking-policy';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const { data: user = null } = useCurrentUser();
  const [booking, setBooking] = useState<(Booking & { payment_status?: string | null }) | null>(null);
  const [legacyJoined, setLegacyJoined] = useState(false);
  const [reviewBookings, setReviewBookings] = useState<
    Array<{
      booking_id: string;
      participant_name: string | null;
      participant_email: string;
      total_price_npr: number;
      payment_id: string | null;
      payment_status: string | null;
      transaction_reference: string | null;
      proof_image_url: string | null;
      proof_submitted_at: string | null;
      review_note: string | null;
      verified_at: string | null;
    }>
  >([]);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentProofImage, setPaymentProofImage] = useState<string | null>(null);
  const [paymentProofStatus, setPaymentProofStatus] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const queryClient = useQueryClient();
  const canCancel =
    user?.role === 'admin' || (user?.role === 'expert' && user?.id === event?.host_user_id);
  const canJoin = user?.role === 'participant' || !user;
  const alreadyJoined =
    user?.role === 'participant' &&
    ((Boolean(booking) && booking?.status !== 'cancelled') || legacyJoined);
  const canUploadPaymentProof = Boolean(booking?.id) && booking?.payment_status !== 'paid';
  const canReviewPayments = Boolean(canCancel);
  const cancellationPolicy = getCancellationPolicy(event?.event_date || new Date().toISOString());
  const cancellationRefundNpr = calculateRefund(
    Number(booking?.total_price_npr || 0),
    cancellationPolicy.refundPercent
  );

  const refreshBooking = useCallback(async () => {
    if (!eventId || !user || user.role !== 'participant') return;
    const res = await fetch(`/api/events/${eventId}/bookings`);
    const data = await res.json();
    setBooking(data.booking || null);
    setLegacyJoined(Boolean(data.legacy_joined));
  }, [eventId, user]);

  const refreshReviewBookings = useCallback(async () => {
    if (!eventId || !canReviewPayments) return;
    const res = await fetch(`/api/events/${eventId}/bookings/review`);
    const data = await res.json();
    setReviewBookings(data.bookings || []);
  }, [eventId, canReviewPayments]);

  const refreshEventAndBooking = useCallback(async () => {
    if (!eventId) return;
    const [eventRes, bookingRes] = await Promise.all([
      fetch(`/api/events/${eventId}`),
      user?.role === 'participant'
        ? fetch(`/api/events/${eventId}/bookings`)
        : Promise.resolve(null),
    ]);
    const eventData = await eventRes.json().catch(() => ({}));
    setEvent(eventData.event || null);
    if (bookingRes) {
      const bookingData = await bookingRes.json().catch(() => ({}));
      setBooking(bookingData.booking || null);
      setLegacyJoined(Boolean(bookingData.legacy_joined));
    }
  }, [eventId, user?.role]);

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

  const joinMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error('Please register or login to join this event.');
      }
      const res = await fetch(`/api/events/${id}/bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spots: 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to join event.');
      }
      return data;
    },
    onSuccess: async () => {
      await refreshEventAndBooking();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant });
      setJoinError(null);
      setActionStatus('You are successfully joined.');
    },
    onError: (error) => {
      setJoinError(error instanceof Error ? error.message : 'Failed to join event.');
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to cancel booking.');
      }
      return data as { refund_npr?: number; policy?: string };
    },
    onSuccess: async (data) => {
      await refreshEventAndBooking();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant });
      const refund = Number(data?.refund_npr || 0);
      const policy = data?.policy ? ` ${data.policy}` : '';
      setActionStatus(
        `Your booking was cancelled.${refund > 0 ? ` Refund: NPR ${refund}.` : ''}${policy}`
      );
      setJoinError(null);
    },
    onError: (error) => {
      setJoinError(error instanceof Error ? error.message : 'Failed to cancel booking.');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (id: string) => leaveEvent(id),
    onSuccess: async () => {
      await refreshEventAndBooking();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant });
      setActionStatus('Your event join has been cancelled.');
      setJoinError(null);
    },
    onError: (error) => {
      setJoinError(error instanceof Error ? error.message : 'Failed to cancel join.');
    },
  });

  const migrateLegacyJoinMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}/bookings/migrate`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to enable payment for this event.');
      }
      return data;
    },
    onSuccess: async () => {
      await refreshEventAndBooking();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant });
      setActionStatus('Payment is now enabled for your existing join.');
      setJoinError(null);
    },
    onError: (error) => {
      setJoinError(
        error instanceof Error ? error.message : 'Failed to enable payment for this event.'
      );
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
    setActionStatus(null);
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !user || user.role !== 'participant') return;
    const fetchBooking = async () => {
      try {
        await refreshBooking();
      } catch {
        setBooking(null);
        setLegacyJoined(false);
      }
    };
    fetchBooking();
  }, [eventId, user, refreshBooking]);

  useEffect(() => {
    if (!eventId || !canReviewPayments) return;
    const fetchReviewBookings = async () => {
      try {
        await refreshReviewBookings();
      } catch {
        setReviewBookings([]);
      }
    };
    fetchReviewBookings();
  }, [eventId, canReviewPayments, refreshReviewBookings]);

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

  const submitPaymentProof = async () => {
    if (!booking?.id) {
      setPaymentProofStatus(
        'Booking record not found yet. Please refresh and try again.'
      );
      return false;
    }
    if (!transactionReference.trim()) {
      setPaymentProofStatus('Please enter transaction reference.');
      return false;
    }
    if (!paymentProofImage) {
      setPaymentProofStatus('Please upload payment proof image.');
      return false;
    }
    try {
      setSubmittingProof(true);
      setPaymentProofStatus(null);
      const res = await fetch(`/api/bookings/${booking.id}/payment-proof`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          transaction_reference: transactionReference.trim(),
          proof_image_url: paymentProofImage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit payment proof.');
      }
      setPaymentProofStatus('Payment proof submitted. Waiting for expert/admin verification.');
      await refreshBooking();
      return true;
    } catch (error) {
      setPaymentProofStatus(
        error instanceof Error ? error.message : 'Failed to submit payment proof.'
      );
      return false;
    } finally {
      setSubmittingProof(false);
    }
  };

  const reviewPaymentProof = async (
    paymentId: string,
    action: 'approve' | 'reject'
  ) => {
    try {
      setReviewingPaymentId(paymentId);
      const res = await fetch(`/api/payments/${paymentId}/review`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          review_note:
            action === 'approve'
              ? 'Payment proof verified.'
              : 'Payment proof rejected. Please re-submit with clear receipt.',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to review payment.');
      }
      await Promise.all([refreshReviewBookings(), refreshBooking()]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to review payment.');
    } finally {
      setReviewingPaymentId(null);
    }
  };

  return (
    <>
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
              Join Event
            </h3>
            {canJoin ? (
              <div className="mt-2 space-y-3">
                {!user && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextPath = `/events/${eventId}`;
                      window.dispatchEvent(
                        new CustomEvent('open-register', {
                          detail: {
                            message: 'Create a participant account to join this event.',
                            next: nextPath,
                          },
                        })
                      );
                    }}
                    className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    Register to Join
                  </button>
                )}
                {user?.role === 'participant' && (
                  alreadyJoined ? (
                    <button
                      type="button"
                      disabled={cancelBookingMutation.isPending || leaveMutation.isPending}
                      onClick={() => {
                        setShowCancelBookingModal(true);
                      }}
                      className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={joinMutation.isPending}
                      onClick={() => {
                        if (!eventId) return;
                        setJoinError(null);
                        joinMutation.mutate(eventId);
                      }}
                      className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {joinMutation.isPending ? 'Joining...' : 'Join Event'}
                    </button>
                  )
                )}
                {joinError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                    {joinError}
                  </p>
                )}
                {actionStatus && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                    {actionStatus}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                Join is available for participants.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
              Payment
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Price per spot: NPR {event.price_npr || 0}
            </p>
            {user?.role === 'participant' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    booking?.payment_status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                  }`}
                >
                  {booking?.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
                {booking?.status && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      booking.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
                        : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100'
                    }`}
                  >
                    {booking.status === 'confirmed'
                      ? 'Booked'
                      : booking.status === 'cancelled'
                        ? 'Cancelled'
                        : 'Pending payment'}
                  </span>
                )}
              </div>
            )}
            {event.price_npr && event.price_npr > 0 && (
              <div className="mt-4 space-y-3">
                {event.qr_image_url ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                      Scan to pay (eSewa)
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.qr_image_url}
                      alt="eSewa QR for event payment"
                      className="h-48 w-48 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                    />
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    Organizer has not uploaded a QR yet. Please contact organizer before paying.
                  </p>
                )}
                {user?.role === 'participant' && alreadyJoined && canUploadPaymentProof && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Complete Payment & Upload Proof
                  </button>
                )}
                {user?.role === 'participant' && alreadyJoined && !booking?.id && (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    <p>
                      This join is from the legacy system. Enable payment to upload proof without rejoining.
                    </p>
                    <button
                      type="button"
                      disabled={migrateLegacyJoinMutation.isPending || !eventId}
                      onClick={() => {
                        if (!eventId) return;
                        setJoinError(null);
                        migrateLegacyJoinMutation.mutate(eventId);
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {migrateLegacyJoinMutation.isPending
                        ? 'Enabling payment...'
                        : 'Enable Payment For This Join'}
                    </button>
                  </div>
                )}
                {paymentProofStatus && (
                  <p className="text-xs text-gray-700 dark:text-slate-200">{paymentProofStatus}</p>
                )}
              </div>
            )}
          </div>

          {canReviewPayments && event.price_npr > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                Payment proof review
              </h3>
              <div className="mt-3 space-y-3">
                {reviewBookings.length === 0 && (
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    No paid booking proofs to review yet.
                  </p>
                )}
                {reviewBookings.map((item) => (
                  <div
                    key={item.booking_id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900/50"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.participant_name || 'Participant'} ({item.participant_email})
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                      Amount: NPR {item.total_price_npr} • Status: {item.payment_status || 'pending'}
                    </p>
                    {item.transaction_reference && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                        Txn ref: {item.transaction_reference}
                      </p>
                    )}
                    {item.proof_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.proof_image_url}
                        alt="Submitted payment proof"
                        className="mt-2 h-28 w-28 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                      />
                    )}
                    {item.payment_id && item.payment_status !== 'paid' && item.proof_submitted_at && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={reviewingPaymentId === item.payment_id}
                          onClick={() => reviewPaymentProof(item.payment_id as string, 'approve')}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Mark paid
                        </button>
                        <button
                          type="button"
                          disabled={reviewingPaymentId === item.payment_id}
                          onClick={() => reviewPaymentProof(item.payment_id as string, 'reject')}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Mark failed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      </div>
      {showCancelBookingModal && alreadyJoined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Cancel booking?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Refund policy: {cancellationPolicy.note}
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
              Expected refund: NPR {cancellationRefundNpr}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              For disputes, contact support/admin for manual review.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelBookingModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Keep booking
              </button>
              <button
                type="button"
                disabled={cancelBookingMutation.isPending || leaveMutation.isPending}
                onClick={() => {
                  setJoinError(null);
                  if (booking?.id) {
                    cancelBookingMutation.mutate(booking.id, {
                      onSettled: () => setShowCancelBookingModal(false),
                    });
                    return;
                  }
                  if (eventId) {
                    leaveMutation.mutate(eventId, {
                      onSettled: () => setShowCancelBookingModal(false),
                    });
                  }
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelBookingMutation.isPending || leaveMutation.isPending
                  ? 'Cancelling...'
                  : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && user?.role === 'participant' && alreadyJoined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Payment & Proof Upload
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Amount to pay: NPR {event.price_npr || 0}
            </p>
            <div className="mt-4 space-y-3">
              {event.qr_image_url ? (
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/40">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                    Scan to pay (eSewa)
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.qr_image_url}
                    alt="eSewa QR for event payment"
                    className="h-48 w-48 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  Organizer has not uploaded a QR yet. Please contact organizer before paying.
                </p>
              )}
              <input
                type="text"
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                placeholder="eSewa transaction reference"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setPaymentProofImage(null);
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setPaymentProofImage(typeof reader.result === 'string' ? reader.result : null);
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              {paymentProofImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={paymentProofImage}
                  alt="Payment proof preview"
                  className="h-32 w-32 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                />
              )}
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
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await submitPaymentProof();
                  if (success) {
                    setShowPaymentModal(false);
                  }
                }}
                disabled={!riskAcknowledged || submittingProof || !booking?.id}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingProof ? 'Submitting...' : 'Submit proof'}
              </button>
            </div>
            {paymentProofStatus && (
              <p className="mt-3 text-xs text-gray-700 dark:text-slate-200">{paymentProofStatus}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
