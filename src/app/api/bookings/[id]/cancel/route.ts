import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';
import {
  buildBookingCancelledEmail,
  buildBrandedEmail,
  getAppUrl,
} from '@/lib/email-templates';
import { requestEsewaRefund } from '@/lib/esewa';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bookingResult = await client.query(
        `
        SELECT
          b.id,
          b.event_id,
          b.user_id,
          b.spots,
          b.total_price_npr,
          b.status,
          b.refund_status,
          e.title,
          e.host_user_id,
          e.event_date,
          u.email,
          u.name,
          e.organizer_email,
          p.id AS payment_id,
          p.provider AS payment_provider,
          p.status AS payment_status,
          p.transaction_uuid,
          p.transaction_reference
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN LATERAL (
          SELECT id, provider, status, transaction_uuid, transaction_reference
          FROM payments
          WHERE booking_id = b.id
          ORDER BY created_at DESC
          LIMIT 1
        ) p ON TRUE
        WHERE b.id = $1
        LIMIT 1
        `,
        [bookingId]
      );

      const booking = bookingResult.rows[0];
      if (!booking) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      const canManageAsHost =
        auth.role === 'expert' && booking.host_user_id && booking.host_user_id === auth.sub;
      if (booking.user_id !== auth.sub && auth.role !== 'admin' && !canManageAsHost) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (booking.status === 'cancelled') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
      }

      const refundNpr = Math.max(0, Number(booking.total_price_npr || 0));
      const paymentStatus = String(booking.payment_status || '').toLowerCase();
      const paymentProvider = String(booking.payment_provider || '').toLowerCase();

      let refundStatus: 'none' | 'requested' | 'settled' | 'failed' = 'none';
      let refundReference: string | null = null;
      let refundGatewayPayload: unknown = null;

      if (refundNpr > 0 && paymentStatus === 'paid') {
        if (paymentProvider === 'esewa' && booking.transaction_uuid) {
          const refundResult = await requestEsewaRefund({
            transactionUuid: String(booking.transaction_uuid),
            totalAmount: String(refundNpr),
            paymentReference: booking.transaction_reference || null,
            reason: 'BOOKING_CANCELLED',
          });
          refundStatus = refundResult.ok ? 'settled' : 'requested';
          refundReference = refundResult.refundReference || null;
          refundGatewayPayload = refundResult.data || {
            status: refundResult.status,
            code: refundResult.statusCode,
          };
        } else {
          refundStatus = 'requested';
        }
      }

      const updatedBooking = await client.query(
        `
        UPDATE bookings
        SET status = 'cancelled',
            cancelled_at = NOW(),
            refund_npr = $2,
            cancellation_policy_snapshot = $3,
            refund_status = $4::varchar,
            refunded_at = CASE WHEN $4::varchar = 'settled' THEN NOW() ELSE NULL END,
            refund_reference = $5::varchar,
            refund_gateway_payload = $6::jsonb
        WHERE id = $1
        RETURNING *
        `,
        [
          bookingId,
          refundNpr,
          'Full refund on cancellation.',
          refundStatus,
          refundReference,
          refundGatewayPayload ? JSON.stringify(refundGatewayPayload) : null,
        ]
      );

      await client.query(
        'UPDATE events SET current_participants = GREATEST(0, current_participants - $2) WHERE id = $1',
        [booking.event_id, booking.spots]
      );

      await client.query(
        `
        UPDATE payments
        SET
          status = CASE
            WHEN $2::varchar = 'settled' AND status = 'paid' THEN 'refunded'
            ELSE status
          END,
          gateway_status = CASE
            WHEN $2::varchar = 'settled' THEN COALESCE(gateway_status, 'REFUNDED')
            WHEN $2::varchar = 'requested' THEN COALESCE(gateway_status, 'REFUND_REQUESTED')
            ELSE gateway_status
          END,
          gateway_payload = CASE
            WHEN $3::jsonb IS NOT NULL THEN $3::jsonb
            ELSE gateway_payload
          END,
          review_note = CASE
            WHEN $2::varchar = 'settled' THEN COALESCE(review_note, 'Refund completed.')
            WHEN $2::varchar = 'requested' THEN COALESCE(review_note, 'Refund requested; pending gateway settlement.')
            ELSE review_note
          END
        WHERE booking_id = $1
        `,
        [bookingId, refundStatus, refundGatewayPayload ? JSON.stringify(refundGatewayPayload) : null]
      );

      await client.query('COMMIT');

      const participantEmail = buildBookingCancelledEmail({
        appUrl: getAppUrl(),
        title: booking.title,
        participantName: booking.name,
        amountNpr: refundNpr,
        eventId: booking.event_id,
      });
      await sendEmailSafe({
        to: booking.email,
        ...participantEmail,
        dedupeKey: `booking:cancel:${booking.id}:${booking.email}:${refundNpr}`,
      });

      if (booking.organizer_email && booking.organizer_email !== booking.email) {
        const refundStateText =
          refundStatus === 'settled'
            ? 'Refund completed via payment gateway.'
            : refundStatus === 'requested'
              ? 'Refund requested and pending settlement.'
              : 'No refund settlement required.';
        const organizerEmail = buildBrandedEmail({
          subject: `Booking cancelled: ${booking.title}`,
          appUrl: getAppUrl(),
          headline: 'Booking cancelled',
          subhead: booking.title,
          bodyHtml: `${booking.name || booking.email} cancelled their booking for <strong>${booking.title}</strong>.<br/><strong>Refund:</strong> ${refundStateText}`,
          bodyText: `${booking.name || booking.email} cancelled their booking. Refund status: ${refundStateText}`,
        });
        await sendEmailSafe({
          to: booking.organizer_email,
          ...organizerEmail,
          dedupeKey: `booking:cancel:organizer:${booking.id}:${booking.organizer_email}:${booking.email}`,
        });
      }

      return NextResponse.json(
        {
          booking: updatedBooking.rows[0],
          refund_npr: refundNpr,
          refund_status: refundStatus,
          refund_reference: refundReference,
          policy: 'Full refund on cancellation.',
        },
        { status: 200 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
