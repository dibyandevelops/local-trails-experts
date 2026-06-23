'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Booking, Event } from '@/types';
import DateText from '@/components/ui/date-text';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getSportLabel } from '@/services/constants/sports';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelEvent, leaveEvent } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { ESEWA_ENABLED } from '@/lib/feature-flags';
import { resizeImageToDataUrl } from '@/lib/image';
import * as Dialog from '@radix-ui/react-dialog';
import EventForm from '@/components/feature-components/event-form/event-form';
import CommunityEventForm from '@/components/feature-components/community-event-form/community-event-form';
import { COMMUNITY_NAME } from '@/lib/branding';

function wrapPosterText(value: string, maxLength = 34) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function loadPosterImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadPosterFonts() {
  await Promise.allSettled([
    document.fonts?.load('700 28px "Space Grotesk"'),
    document.fonts?.load('800 36px "Space Grotesk"'),
    document.fonts?.load('900 78px "Space Grotesk"'),
  ]);
}

function drawPosterTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number
) {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function truncatePosterText(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

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
      proof_image_url?: string | null;
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
  const [joinError, setJoinError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDraftImage, setQrDraftImage] = useState<string | null>(null);
  const [savingQr, setSavingQr] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
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
  const canReviewPayments = Boolean(canCancel);
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
    setTransactionReference(booking?.transaction_reference || '');
    setPaymentProofImage(booking?.proof_image_url || null);
  }, [showPaymentModal, booking?.transaction_reference, booking?.proof_image_url]);

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
    return (
      <div className="mx-auto max-w-5xl space-y-4 py-6">
        <div className="h-44 animate-pulse rounded-3xl bg-gray-100 dark:bg-slate-800" />
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="h-72 animate-pulse rounded-3xl bg-gray-100 dark:bg-slate-800" />
          <div className="h-72 animate-pulse rounded-3xl bg-gray-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/70 px-5 py-12 text-center dark:border-emerald-900/70 dark:bg-emerald-950/20">
        <p className="text-lg font-black text-gray-950 dark:text-white">Event not found</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          This event may have been removed or is no longer available.
        </p>
        <button
          type="button"
          onClick={() => router.push('/events')}
          className="mt-4 inline-flex rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
        >
          Back to events
        </button>
      </div>
    );
  }

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
  const isCommunityEvent =
    (event.organizer_name || '').toLowerCase().includes(COMMUNITY_NAME.toLowerCase()) ||
    (adminEmail && (event.organizer_email || '').toLowerCase() === adminEmail);

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

  const uploadOrReplaceQr = async () => {
    if (!eventId || !qrDraftImage) return;
    try {
      setActionStatus(null);
      setSavingQr(true);
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qr_image_url: qrDraftImage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to upload QR.');
      }
      await refreshEventAndBooking();
      setActionStatus(event?.qr_image_url ? 'QR updated successfully.' : 'QR uploaded successfully.');
      setShowQrModal(false);
      setQrDraftImage(null);
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : 'Failed to upload QR.');
    } finally {
      setSavingQr(false);
    }
  };

  const shareEvent = async () => {
    if (!event) return;
    const shareUrl = window.location.href;
    const shareText = `${event.title}${event.city ? ` in ${event.city}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
        setActionStatus('Event share sheet opened.');
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setActionStatus('Event link copied.');
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      setActionStatus('Event link copied.');
    }
  };

  const downloadEventPoster = async () => {
    if (!event) return;
    await loadPosterFonts();
    const dateLabel = new Date(event.event_date).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const titleLines = wrapPosterText(event.title, 26);
    const trailName = event.trail?.name || event.city || 'Local ride';
    const infoItems = [
      { label: 'When', value: dateLabel },
      { label: 'Trail', value: trailName },
      { label: 'Meeting Point', value: event.meeting_point || event.city || 'Shared after registration' },
      { label: 'Fee', value: Number(event.price_npr || 0) > 0 ? `NPR ${event.price_npr}` : 'Free' },
    ];
    const alert = event.trail_alert ? truncatePosterText(event.trail_alert, 118) : '';
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setActionStatus('Unable to generate poster.');
      return;
    }

    const logo = await loadPosterImage('/icons/logo-transparent-source.png');
    const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, '#04130d');
    bg.addColorStop(0.58, '#063824');
    bg.addColorStop(1, '#365314');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1350);

    const glow = ctx.createRadialGradient(800, 260, 20, 800, 260, 640);
    glow.addColorStop(0, 'rgba(217, 249, 157, 0.72)');
    glow.addColorStop(1, 'rgba(217, 249, 157, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.fillStyle = 'rgba(190, 242, 100, 0.14)';
    ctx.beginPath();
    ctx.arc(930, 190, 230, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.translate(610, 520);
    ctx.rotate(-0.14);
    ctx.drawImage(logo, -70, -40, 560, 560);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.drawImage(logo, 660, 850, 320, 320);
    ctx.restore();

    ctx.drawImage(logo, 78, 68, 82, 82);
    ctx.fillStyle = '#d9f99d';
    ctx.font = '800 34px "Space Grotesk", Arial, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('LOCOXPERTS', 184, 122);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = '#f7fee7';
    ctx.font = '900 82px "Space Grotesk", Arial, sans-serif';
    drawPosterTextLines(ctx, titleLines, 80, 270, 90);

    ctx.fillStyle = '#d9f99d';
    ctx.font = '800 34px "Space Grotesk", Arial, sans-serif';
    ctx.fillText('Ride plan', 80, 555);

    infoItems.forEach((item, index) => {
      const x = index % 2 === 0 ? 80 : 565;
      const y = 620 + Math.floor(index / 2) * 145;
      ctx.fillStyle = 'rgba(2, 44, 34, 0.72)';
      ctx.beginPath();
      ctx.roundRect(x, y, 435, 106, 28);
      ctx.fill();
      ctx.fillStyle = '#bef264';
      ctx.font = '800 22px "Space Grotesk", Arial, sans-serif';
      ctx.fillText(item.label.toUpperCase(), x + 28, y + 38);
      ctx.fillStyle = '#f7fee7';
      ctx.font = '800 30px "Space Grotesk", Arial, sans-serif';
      ctx.fillText(truncatePosterText(item.value, 28), x + 28, y + 78);
    });

    if (alert) {
      ctx.fillStyle = 'rgba(2, 44, 34, 0.78)';
      ctx.beginPath();
      ctx.roundRect(70, 880, 940, 170, 34);
      ctx.fill();
      ctx.fillStyle = '#bef264';
      ctx.font = '900 28px "Space Grotesk", Arial, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('TRAIL ALERT', 105, 930);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = '#f7fee7';
      ctx.font = '700 30px "Space Grotesk", Arial, sans-serif';
      drawPosterTextLines(ctx, wrapPosterText(alert, 48).slice(0, 2), 105, 985, 40);
    }

    ctx.fillStyle = '#f7fee7';
    ctx.font = '800 30px "Space Grotesk", Arial, sans-serif';
    ctx.fillText('Find trails, experts, and ride support', 80, 1235);
    ctx.fillStyle = '#d9f99d';
    ctx.font = '700 28px "Space Grotesk", Arial, sans-serif';
    ctx.fillText(truncatePosterText(window.location.href, 62), 80, 1285);

    canvas.toBlob((blob) => {
      if (!blob) {
        setActionStatus('Unable to generate poster.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event'}-poster.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setActionStatus('Event poster PNG generated.');
    }, 'image/png');
  };


  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-sm dark:border-emerald-900/70 dark:from-slate-950 dark:via-emerald-950/45 dark:to-lime-950/20 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/20" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-lime-200/20 blur-3xl dark:bg-lime-700/10" />
        <Link
          href="/events"
          className="text-xs font-semibold uppercase tracking-wide text-emerald-700 hover:underline dark:text-emerald-200"
        >
          ← Back to events
        </Link>
        <div className="relative mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-balance text-3xl font-black text-gray-950 dark:text-white md:text-5xl">
              {event.title}
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-300">
              <DateText value={event.event_date} pattern="PPP p" />
              {event.city ? ` • ${event.city}` : ''}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.sport_type && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                  {getSportLabel(event.sport_type)}
                </span>
              )}
              {event.difficulty && (
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
                  {getDifficultyLabel(event.difficulty)}
                </span>
              )}
              {event.required_expertise && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm dark:bg-emerald-900/60 dark:text-emerald-100">
                  {event.required_expertise}
                </span>
              )}
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm dark:bg-amber-900/60 dark:text-amber-100">
                {event.price_npr && event.price_npr > 0
                  ? `NPR ${event.price_npr}`
                  : 'Free'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={shareEvent}
              className="inline-flex items-center rounded-xl border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            >
              Share Event
            </button>
            <button
              type="button"
              onClick={downloadEventPoster}
              className="inline-flex items-center rounded-xl border border-lime-300 bg-lime-50 px-4 py-2 text-sm font-bold text-green-900 transition duration-200 hover:-translate-y-0.5 hover:bg-lime-100 dark:border-lime-700 dark:bg-lime-950/30 dark:text-lime-100 dark:hover:bg-lime-900/40"
            >
              Download Poster
            </button>
            {event.host_user_id && (
              <button
                type="button"
                onClick={() => router.push(`/experts/${event.host_user_id}`)}
                className="inline-flex items-center rounded-xl border border-emerald-600 px-4 py-2 text-sm font-bold text-emerald-700 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                View Expert Profile
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowEditEventModal(true)}
                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Edit Event
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
                className="inline-flex items-center rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="text-lg font-black text-gray-950 dark:text-white">
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
                    className="inline-flex items-center rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
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
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            )}
            {event.trail_alert && (
              <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-green-950 dark:border-lime-900/60 dark:bg-lime-950/25 dark:text-lime-100">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700 dark:text-lime-300">
                  Trail Alert
                </p>
                <p className="mt-1 leading-6">{event.trail_alert}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600 dark:text-slate-300">
              Organizer
            </h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-slate-200">
              <p className="font-semibold text-gray-900 dark:text-white">
                {event.organizer_name || 'LocoXperts'}
              </p>
              {event.organizer_email && <p>{event.organizer_email}</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600 dark:text-slate-300">
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
                    className="w-full rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
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
                      {isPaidEvent &&
                        booking?.status !== 'cancelled' &&
                        booking?.payment_status !== 'paid' && (
                          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                            Your participation is not fully confirmed yet. Complete payment to
                            confirm your event seat.
                          </p>
                        )}
                      {booking?.status !== 'cancelled' &&
                        booking?.payment_status !== 'paid' &&
                        Number(booking?.total_price_npr || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full rounded-xl border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                          >
                            Go to Payment
                          </button>
                        )}
                      <button
                        type="button"
                        disabled={cancelBookingMutation.isPending || leaveMutation.isPending}
                        onClick={() => {
                          setShowCancelBookingModal(true);
                        }}
                        className="w-full rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        {cancelBookingMutation.isPending ? 'Processing...' : 'Cancel Booking'}
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
                      className="w-full rounded-xl bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600 dark:text-slate-300">
              Payment
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              Price per spot: {Number(event.price_npr || 0) > 0 ? `NPR ${event.price_npr}` : 'Free'}
            </p>
            {canCancel && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="rounded-xl border border-indigo-300 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
                >
                  {event.qr_image_url ? 'Re-upload QR' : 'Upload QR'}
                </button>
              </div>
            )}
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
                {user?.role === 'participant' &&
                alreadyJoined &&
                booking?.payment_status === 'paid' ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                    Payment confirmed. Your booking is fully secured for this event.
                  </p>
                ) : event.qr_image_url ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60">
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
                      className="mt-2 inline-flex rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                      View full QR
                    </button>
                  </div>
                ) : null}
                {user?.role === 'participant' &&
                  alreadyJoined &&
                  booking?.payment_status !== 'paid' &&
                  canStartEsewaPayment && (
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
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {startingPayment ? 'Redirecting to payment...' : 'Pay online'}
                      </button>
                    )}
                    {event.qr_image_url && (
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
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
                      className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
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
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-600 dark:text-slate-300">
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
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700">
                <table className="min-w-[980px] w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Participant</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold">Location</th>
                      <th className="px-3 py-2 font-semibold">Amount</th>
                      <th className="px-3 py-2 font-semibold">Booking</th>
                      <th className="px-3 py-2 font-semibold">Payment</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewBookings.map((item) => {
                      const canRequestPayment =
                        item.booking_status !== 'cancelled' &&
                        item.payment_status !== 'paid' &&
                        item.payment_status !== 'refunded';
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
                                className="rounded-xl border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
                              >
                                {requestingPaymentBookingId === item.booking_id
                                  ? 'Sending...'
                                  : 'Request Payment'}
                              </button>
                              {/* Refund action is temporarily disabled. */}
                              {item.proof_image_url && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setImagePreview({
                                      src: item.proof_image_url as string,
                                      alt: 'Submitted payment screenshot',
                                    })
                                  }
                                  className="rounded-xl border border-gray-300 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
              This action will remove your booking for this event.
            </p>
            <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-200">
              Any refund (if applicable) will be processed manually by admin/expert.
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
                  : 'Confirm Cancel'}
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
                  QR is not available for this event. You can still upload payment reference.
                </p>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                2) Add or update transaction details
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
                  {booking?.proof_image_url && (
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      Submitting again will replace your previously uploaded payment reference.
                    </p>
                  )}
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
                {submittingProof
                  ? 'Submitting...'
                  : booking?.proof_image_url
                    ? 'Replace Screenshot'
                    : 'Submit Screenshot'}
              </button>
            </div>
            {paymentActionStatus && (
              <p className="mt-3 text-xs text-gray-700 dark:text-slate-200">{paymentActionStatus}</p>
            )}
          </div>
        </div>
      )}
      {showQrModal && canCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {event?.qr_image_url ? 'Re-upload event QR' : 'Upload event QR'}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Participants will use this QR for manual payment screenshots.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setQrDraftImage(null);
                    return;
                  }
                  try {
                    const dataUrl = await resizeImageToDataUrl(file, {
                      maxDimension: 1024,
                      quality: 0.82,
                    });
                    setQrDraftImage(dataUrl);
                  } catch {
                    setActionStatus('Unable to process QR image.');
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              {qrDraftImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDraftImage}
                  alt="Event QR preview"
                  className="h-40 w-40 rounded border border-gray-200 object-contain bg-white dark:border-slate-700"
                />
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setQrDraftImage(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!qrDraftImage || savingQr}
                onClick={uploadOrReplaceQr}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingQr ? 'Saving...' : event?.qr_image_url ? 'Replace QR' : 'Upload QR'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog.Root open={showEditEventModal} onOpenChange={setShowEditEventModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-black text-gray-950 dark:text-white">
                  {isCommunityEvent ? 'Edit Community Event' : 'Edit Event'}
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {isCommunityEvent
                    ? 'Update the community ride format, trail, schedule, and participant notice.'
                    : 'Update event details, payment QR, trail alert, and route context.'}
                </p>
              </div>
              <Dialog.Close className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Close
              </Dialog.Close>
            </div>
            {eventId && isCommunityEvent ? (
              <CommunityEventForm
                mode="edit"
                event={event}
                onCompleted={async () => {
                  await refreshEventAndBooking();
                  setShowEditEventModal(false);
                  setActionStatus('Community event updated successfully.');
                }}
                onCancel={() => setShowEditEventModal(false)}
              />
            ) : eventId ? (
              <EventForm
                mode="edit"
                editEventId={eventId}
                embedded
                initialUser={user}
                onCompleted={async () => {
                  await refreshEventAndBooking();
                  setShowEditEventModal(false);
                  setActionStatus('Event updated successfully.');
                }}
                onCancel={() => setShowEditEventModal(false)}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
