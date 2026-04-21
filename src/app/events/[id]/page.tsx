'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Booking, Event } from '@/types';
import DateText from '@/components/ui/date-text';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel } from '@/services/constants/sports';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelEvent, leaveEvent } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { ESEWA_ENABLED } from '@/lib/feature-flags';

export default function EventDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const [event, setEvent] = useState<Event | null>(null);
  const { data: user = null } = useCurrentUser();
  const [booking, setBooking] = useState<
    (Booking & {
      payment_status?: string | null;
      refund_status?: string | null;
      refund_reference?: string | null;
      proof_submitted_at?: string | null;
      transaction_reference?: string | null;
      payment_provider?: string | null;
    }) | null
  >(null);
  const [legacyJoined, setLegacyJoined] = useState(false);
  const [reviewBookings, setReviewBookings] = useState<
    Array<{
      booking_id: string;
      booking_status: string;
      refund_status: string | null;
      refund_reference: string | null;
      participant_name: string | null;
      participant_email: string;
      participant_phone: string | null;
      participant_city: string | null;
      total_price_npr: number;
      payment_id: string | null;
      payment_provider: string | null;
      payment_status: string | null;
      transaction_uuid: string | null;
      gateway_status: string | null;
      paid_at: string | null;
      transaction_reference: string | null;
      proof_image_url: string | null;
      proof_submitted_at: string | null;
      review_note: string | null;
      verified_at: string | null;
    }>
  >([]);
  const [paymentActionStatus, setPaymentActionStatus] = useState<string | null>(null);
  const [reviewActionStatus, setReviewActionStatus] = useState<string | null>(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRiskAcknowledged, setPaymentRiskAcknowledged] = useState(false);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentProofImage, setPaymentProofImage] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);
  const [requestingPaymentBookingId, setRequestingPaymentBookingId] = useState<string | null>(null);
  const [refundingBookingId, setRefundingBookingId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<{
    bookingId: string;
    participantName: string;
    amountNpr: number;
  } | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const canCancel =
    user?.role === 'admin' || (user?.role === 'expert' && user?.id === event?.host_user_id);
  const canJoin = user?.role === 'participant' || !user;
  const alreadyJoined =
    user?.role === 'participant' &&
    ((Boolean(booking) && booking?.status !== 'cancelled') || legacyJoined);
  const canStartEsewaPayment =
    ESEWA_ENABLED &&
    Boolean(booking?.id) &&
    booking?.status !== 'cancelled' &&
    booking?.payment_status !== 'paid' &&
    Number(booking?.total_price_npr || 0) > 0;
  const isPaidBooking = booking?.payment_status === 'paid';
  const canReviewPayments = Boolean(canCancel);
  const cancellationRefundNpr = isPaidBooking
    ? Math.max(0, Number(booking?.total_price_npr || 0))
    : 0;
  const isEventPast = event ? new Date(event.event_date).getTime() < Date.now() : false;
  const isEventFull = event
    ? Number(event.current_participants) >= Number(event.max_participants)
    : false;
  const canGuestRegisterToJoin = !user && !isEventPast && !isEventFull;
  const canParticipantJoinNow =
    user?.role === 'participant' && !alreadyJoined && !isEventPast && !isEventFull;
  const isPaidEvent = Number(event?.price_npr || 0) > 0;
  const isCancelledBooking = booking?.status === 'cancelled';
  const hasBookingProofPending = Boolean(
    booking?.proof_submitted_at && booking?.payment_status !== 'paid' && booking?.payment_status !== 'refunded'
  );
  const participantPaymentBadge =
    booking?.payment_status === 'paid'
      ? {
          label: 'Paid',
          className:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
        }
      : booking?.payment_status === 'refunded'
        ? {
            label: 'Refunded',
            className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100',
          }
        : hasBookingProofPending
          ? {
              label: 'Proof Submitted',
              className:
                'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
            }
          : isPaidEvent && !isCancelledBooking
            ? {
                label: 'Payment Pending',
                className:
                  'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
              }
            : {
                label: 'Not Required',
                className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100',
              };
  const participantBookingBadge = !booking?.status
    ? null
    : booking.status === 'cancelled'
      ? {
          label: 'Cancelled',
          className: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200',
        }
      : booking.status === 'confirmed' && (!isPaidEvent || booking?.payment_status === 'paid')
        ? {
            label: 'Confirmed',
            className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
          }
        : {
            label: 'Booked',
            className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100',
          };

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
      await queryClient.invalidateQueries({ queryKey: ['events'] });
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
      if (isEventPast) {
        throw new Error('This event has already ended.');
      }
      if (isEventFull) {
        throw new Error('This event is full.');
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
      if (Number(event?.price_npr || 0) > 0) {
        setActionStatus('You are booked. Please complete payment to confirm your spot.');
        setShowPaymentModal(true);
      } else {
        setActionStatus('You are successfully joined.');
      }
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
      return data as { refund_npr?: number };
    },
    onSuccess: async (data) => {
      await refreshEventAndBooking();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant });
      const refund = Number(data?.refund_npr || 0);
      setActionStatus(
        `Your booking was cancelled.${refund > 0 ? ` Refund: NPR ${refund}.` : ''}`
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
    if (!eventId || !user || user.role !== 'participant') return;
    const paymentParam = searchParams?.get('payment');
    if (!paymentParam) return;
    if (paymentParam === 'success') {
      setPaymentActionStatus('Payment verified successfully.');
    } else if (paymentParam === 'failed') {
      setPaymentActionStatus('Payment was not completed. Please try again.');
    }
    refreshBooking().catch(() => null);
  }, [eventId, user, searchParams, refreshBooking]);

  useEffect(() => {
    if (!showPaymentModal) return;
    setPaymentRiskAcknowledged(false);
  }, [showPaymentModal]);

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

  const initiateEsewaPayment = async () => {
    if (!booking?.id) {
      setPaymentActionStatus('Booking record not found yet.');
      return;
    }
    try {
      setStartingPayment(true);
      setPaymentActionStatus(null);
      const response = await fetch('/api/payments/esewa/initiate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to start eSewa payment.');
      }

      const checkoutUrl = String(data?.checkout_url || '').trim();
      const fields = data?.fields as Record<string, string>;
      if (!checkoutUrl || !fields || typeof fields !== 'object') {
        throw new Error('Invalid eSewa checkout payload.');
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl;
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value ?? '');
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      setPaymentActionStatus(
        error instanceof Error ? error.message : 'Unable to start payment.'
      );
    } finally {
      setStartingPayment(false);
    }
  };

  const submitPaymentProof = async () => {
    if (!booking?.id) {
      setPaymentActionStatus('Booking record not found yet. Please refresh and try again.');
      return false;
    }
    if (!transactionReference.trim()) {
      setPaymentActionStatus('Please enter the transaction reference.');
      return false;
    }
    if (!paymentProofImage) {
      setPaymentActionStatus('Please upload your payment screenshot.');
      return false;
    }
    try {
      setSubmittingProof(true);
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
      setPaymentActionStatus(
        'Payment proof submitted. Verification is pending with organizer/admin.'
      );
      await Promise.all([refreshBooking(), refreshReviewBookings()]);
      return true;
    } catch (error) {
      setPaymentActionStatus(
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
              ? 'Payment proof verified manually.'
              : 'Payment proof rejected. Please re-submit with clear screenshot.',
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

  const requestPaymentReminder = async (bookingId: string) => {
    if (!eventId) return;
    try {
      setReviewActionStatus(null);
      setRequestingPaymentBookingId(bookingId);
      const res = await fetch(`/api/events/${eventId}/bookings/request-payment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send payment request.');
      }
      setReviewActionStatus(
        data?.skipped
          ? 'Payment reminder was already sent recently.'
          : 'Payment reminder email sent to participant.'
      );
    } catch (error) {
      setReviewActionStatus(
        error instanceof Error ? error.message : 'Failed to send payment request.'
      );
    } finally {
      setRequestingPaymentBookingId(null);
    }
  };

  const initiateRefundForBooking = async (bookingId: string) => {
    try {
      setReviewActionStatus(null);
      setRefundingBookingId(bookingId);
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to initiate refund.');
      }
      await Promise.all([refreshReviewBookings(), refreshEventAndBooking()]);
      const refund = Number(data?.refund_npr || 0);
      setReviewActionStatus(
        `Booking cancelled and refund initiated${refund > 0 ? ` (NPR ${refund})` : ''}.`
      );
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
      if (eventId) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.byId(eventId) });
      }
    } catch (error) {
      setReviewActionStatus(
        error instanceof Error ? error.message : 'Failed to initiate refund.'
      );
    } finally {
      setRefundingBookingId(null);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 p-6 shadow-md shadow-emerald-100/60 dark:border-emerald-900/60 dark:from-emerald-950/60 dark:via-slate-950/70 dark:to-emerald-900/40 dark:shadow-emerald-950/30">
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/20" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-lime-200/20 blur-3xl dark:bg-lime-700/10" />
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
                className="inline-flex items-center rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                View Expert Profile
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
                className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60">
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
              <div className="space-y-3">
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
                {event.trail.id && (
                  <button
                    type="button"
                    onClick={() => router.push(`/trails/${event.trail?.id}`)}
                    className="inline-flex items-center rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    View Event Route
                  </button>
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

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60">
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
              Join Event
            </h3>
            {canJoin ? (
              <div className="mt-2 space-y-3">
                {isEventPast && !alreadyJoined ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    This event has already ended. You can still view the event details.
                  </p>
                ) : null}
                {canGuestRegisterToJoin && (
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
                {!user && isEventFull && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    This event is full. You can still view the event details.
                  </p>
                )}
                {user?.role === 'participant' && (
                  alreadyJoined ? (
                    <div className="space-y-2">
                      {booking?.status !== 'cancelled' &&
                        booking?.payment_status !== 'paid' &&
                        Number(booking?.total_price_npr || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Submit Payment Proof
                          </button>
                        )}
                      <button
                        type="button"
                        disabled={cancelBookingMutation.isPending || leaveMutation.isPending}
                        onClick={() => {
                          setShowCancelBookingModal(true);
                        }}
                        className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {cancelBookingMutation.isPending
                          ? 'Processing...'
                          : isPaidBooking
                            ? 'Request Refund / Cancel'
                            : 'Cancel Booking'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canParticipantJoinNow || joinMutation.isPending}
                      onClick={() => {
                        if (!canParticipantJoinNow) return;
                        if (!eventId) return;
                        setJoinError(null);
                        joinMutation.mutate(eventId);
                      }}
                      className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {joinMutation.isPending
                        ? 'Joining...'
                        : isEventPast
                          ? 'Event Ended'
                          : isEventFull
                            ? 'Event Full'
                            : 'Join Event'}
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
              Payment
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Price per spot: {Number(event.price_npr || 0) > 0 ? `NPR ${event.price_npr}` : 'Free'}
            </p>
            {user?.role === 'participant' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${participantPaymentBadge.className}`}
                >
                  Payment: {participantPaymentBadge.label}
                </span>
                {participantBookingBadge && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${participantBookingBadge.className}`}
                  >
                    Booking: {participantBookingBadge.label}
                  </span>
                )}
                {booking?.status === 'cancelled' && booking?.refund_status && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      booking.refund_status === 'settled'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                        : booking.refund_status === 'requested'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    Refund: {booking.refund_status}
                  </span>
                )}
              </div>
            )}
            {event.price_npr && event.price_npr > 0 && (
              <div className="mt-4 space-y-3">
                {event.qr_image_url ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                      Scan to pay
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.qr_image_url}
                      alt="Payment QR for event"
                      className="h-48 w-48 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImagePreview({
                          src: event.qr_image_url as string,
                          alt: 'Payment QR for event',
                        })
                      }
                      className="mt-2 inline-flex rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                      View full QR
                    </button>
                  </div>
                ) : null}
                {user?.role === 'participant' && alreadyJoined && canStartEsewaPayment && (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                      <p className="font-semibold">How payment works</p>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                        {ESEWA_ENABLED && <li>Choose online payment or QR + proof.</li>}
                        <li>Pay the exact amount shown for your booking.</li>
                        <li>Your booking confirms once payment is verified.</li>
                      </ol>
                    </div>
                    {ESEWA_ENABLED && (
                      <button
                        type="button"
                        onClick={initiateEsewaPayment}
                        disabled={startingPayment}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {startingPayment ? 'Redirecting to payment...' : 'Pay online'}
                      </button>
                    )}
                    {event.qr_image_url && (
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                      >
                        Pay by QR & Upload Screenshot
                      </button>
                    )}
                  </div>
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
                {paymentActionStatus && (
                  <p className="text-xs text-gray-700 dark:text-slate-200">{paymentActionStatus}</p>
                )}
              </div>
            )}
          </div>

        </div>
      </section>
      {canReviewPayments && event.price_npr > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
            Participants & Payment Status
          </h3>
          <div className="mt-3 space-y-3">
            {reviewActionStatus && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                {reviewActionStatus}
              </p>
            )}
            {reviewBookings.length === 0 && (
              <p className="text-sm text-gray-600 dark:text-slate-300">
                No paid bookings yet.
              </p>
            )}
            {reviewBookings.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                <table className="min-w-[980px] w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Participant</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold">Location</th>
                      <th className="px-3 py-2 font-semibold">Amount</th>
                      <th className="px-3 py-2 font-semibold">Booking</th>
                      <th className="px-3 py-2 font-semibold">Payment</th>
                      <th className="px-3 py-2 font-semibold">Refund</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewBookings.map((item) => {
                      const canRequestPayment =
                        item.booking_status !== 'cancelled' &&
                        item.payment_status !== 'paid' &&
                        item.payment_status !== 'refunded';
                      const canRefund =
                        item.booking_status !== 'cancelled' &&
                        item.payment_status === 'paid' &&
                        item.refund_status !== 'requested' &&
                        item.refund_status !== 'settled';
                      const isPaidBookingItem = item.payment_status === 'paid';
                      const hasProofPending =
                        Boolean(item.proof_submitted_at) &&
                        item.payment_status !== 'paid' &&
                        item.payment_status !== 'refunded';
                      const bookingBadge =
                        item.booking_status === 'cancelled'
                          ? {
                              label: 'Cancelled',
                              className:
                                'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200',
                            }
                          : item.booking_status === 'confirmed' &&
                              (item.total_price_npr <= 0 || isPaidBookingItem)
                            ? {
                                label: 'Confirmed',
                                className:
                                  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
                              }
                            : {
                                label: 'Booked',
                                className:
                                  'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100',
                              };
                      const paymentBadge =
                        item.payment_status === 'paid'
                          ? {
                              label: 'Paid',
                              className:
                                'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
                            }
                          : item.payment_status === 'refunded'
                            ? {
                                label: 'Refunded',
                                className:
                                  'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100',
                              }
                            : item.payment_status === 'failed'
                              ? {
                                  label: 'Failed',
                                  className:
                                    'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200',
                                }
                              : hasProofPending
                                ? {
                                    label: 'Proof Submitted',
                                    className:
                                      'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
                                  }
                                : item.total_price_npr > 0 && item.booking_status !== 'cancelled'
                                  ? {
                                      label: 'Pending',
                                      className:
                                        'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
                                    }
                                  : {
                                      label: 'Not Required',
                                      className:
                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                                    };
                      return (
                        <tr
                          key={item.booking_id}
                          className="border-t border-gray-200 align-top dark:border-slate-700"
                        >
                          <td className="px-3 py-2 text-gray-900 dark:text-slate-100">
                            <div className="font-medium">{item.participant_name || 'Participant'}</div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">
                              {item.participant_email}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                            {item.participant_phone || '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                            {item.participant_city || '—'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                            NPR {item.total_price_npr}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${bookingBadge.className}`}
                            >
                              {bookingBadge.label}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                                item.refund_status === 'settled'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                                  : item.refund_status === 'requested'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                                    : item.refund_status === 'failed'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {item.refund_status || 'none'}
                            </span>
                            {item.refund_reference && (
                              <div className="mt-1 text-[11px] text-gray-600 dark:text-slate-300">
                                Ref: {item.refund_reference}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${paymentBadge.className}`}
                            >
                              {paymentBadge.label}
                            </span>
                            {item.paid_at && (
                              <div className="mt-1 text-[11px] text-gray-600 dark:text-slate-300">
                                <DateText value={item.paid_at} pattern="PPP p" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={
                                  !canRequestPayment ||
                                  requestingPaymentBookingId === item.booking_id
                                }
                                onClick={() => requestPaymentReminder(item.booking_id)}
                                className="rounded-lg border border-emerald-300 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                              >
                                {requestingPaymentBookingId === item.booking_id
                                  ? 'Sending...'
                                  : 'Request Payment'}
                              </button>
                              {canRefund && (
                                <button
                                  type="button"
                                  disabled={refundingBookingId === item.booking_id}
                                  onClick={() =>
                                    setRefundTarget({
                                      bookingId: item.booking_id,
                                      participantName: item.participant_name || 'Participant',
                                      amountNpr: Number(item.total_price_npr || 0),
                                    })
                                  }
                                  className="rounded-lg border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                                >
                                  {refundingBookingId === item.booking_id
                                    ? 'Refunding...'
                                    : 'Initiate Refund'}
                                </button>
                              )}
                              {item.proof_image_url && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setImagePreview({
                                      src: item.proof_image_url as string,
                                      alt: 'Submitted payment screenshot',
                                    })
                                  }
                                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  View Proof
                                </button>
                              )}
                              {item.payment_id &&
                                item.payment_status !== 'paid' &&
                                item.proof_submitted_at && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={reviewingPaymentId === item.payment_id}
                                      onClick={() =>
                                        reviewPaymentProof(item.payment_id as string, 'approve')
                                      }
                                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                      Mark Paid
                                    </button>
                                    <button
                                      type="button"
                                      disabled={reviewingPaymentId === item.payment_id}
                                      onClick={() =>
                                        reviewPaymentProof(item.payment_id as string, 'reject')
                                      }
                                      className="rounded-lg border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                                    >
                                      Mark Failed
                                    </button>
                                  </>
                                )}
                            </div>
                            {(item.transaction_reference || item.transaction_uuid) && (
                              <div className="mt-2 space-y-1 text-[11px] text-gray-600 dark:text-slate-300">
                                {item.transaction_reference && <div>Ref: {item.transaction_reference}</div>}
                                {item.transaction_uuid && <div>Txn UUID: {item.transaction_uuid}</div>}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
      </div>
      {showCancelBookingModal && alreadyJoined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Cancel booking?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              {isPaidBooking
                ? 'You will receive a full refund after cancellation.'
                : 'This booking is not paid yet. Cancellation will not trigger a refund.'}
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
                  : isPaidBooking
                    ? 'Confirm Refund Request'
                    : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Initiate refund?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              This will cancel the booking for <strong>{refundTarget.participantName}</strong> and
              start a full refund process.
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
              Refund amount: NPR {refundTarget.amountNpr}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                disabled={refundingBookingId === refundTarget.bookingId}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={refundingBookingId === refundTarget.bookingId}
                onClick={async () => {
                  const target = refundTarget;
                  if (!target) return;
                  await initiateRefundForBooking(target.bookingId);
                  setRefundTarget(null);
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refundingBookingId === refundTarget.bookingId
                  ? 'Refunding...'
                  : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showPaymentModal && user?.role === 'participant' && alreadyJoined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Pay by QR & Submit Screenshot
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Amount to pay: NPR {booking?.total_price_npr || event.price_npr || 0}
            </p>
            <div className="mt-4 space-y-3">
              {event.qr_image_url ? (
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/40">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                    1) Scan this QR and pay
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.qr_image_url}
                    alt="Payment QR for event"
                    className="h-48 w-48 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImagePreview({
                        src: event.qr_image_url as string,
                        alt: 'Payment QR for event',
                      })
                    }
                    className="mt-2 inline-flex rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    View full QR
                  </button>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  QR is not available for this event.
                </p>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                2) Add transaction details
              </p>
              <input
                type="text"
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                placeholder="Transaction reference"
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
                    setPaymentProofImage(
                      typeof reader.result === 'string' ? reader.result : null
                    );
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              {paymentProofImage && (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentProofImage}
                    alt="Payment screenshot preview"
                    className="h-32 w-32 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImagePreview({
                        src: paymentProofImage,
                        alt: 'Payment screenshot preview',
                      })
                    }
                    className="inline-flex rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    View full screenshot
                  </button>
                </div>
              )}
              <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                <input
                  type="checkbox"
                  checked={paymentRiskAcknowledged}
                  onChange={(event) => setPaymentRiskAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                />
                <span>I confirm I paid the full amount and uploaded a valid screenshot.</span>
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
                  const ok = await submitPaymentProof();
                  if (ok) setShowPaymentModal(false);
                }}
                disabled={!paymentRiskAcknowledged || submittingProof || !booking?.id}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingProof ? 'Submitting...' : 'Submit Screenshot'}
              </button>
            </div>
            {paymentActionStatus && (
              <p className="mt-3 text-xs text-gray-700 dark:text-slate-200">{paymentActionStatus}</p>
            )}
          </div>
        </div>
      )}
      {imagePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Image preview</h3>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview.src}
              alt={imagePreview.alt}
              className="max-h-[75vh] w-full rounded-lg border border-gray-200 object-contain bg-white dark:border-slate-700"
            />
          </div>
        </div>
      )}
    </>
  );
}
