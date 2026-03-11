import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { calculateRefund, getCancellationPolicy } from '@/lib/booking-policy';
import { sendEmailSafe } from '@/lib/email';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
          e.title,
          e.event_date,
          u.email,
          u.name,
          e.organizer_email
        FROM bookings b
        JOIN events e ON e.id = b.event_id
        JOIN users u ON u.id = b.user_id
        WHERE b.id = $1
        LIMIT 1
        `,
        [params.id]
      );

      const booking = bookingResult.rows[0];
      if (!booking) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      if (booking.user_id !== auth.sub && auth.role !== 'admin') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (booking.status === 'cancelled') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
      }

      const policy = getCancellationPolicy(booking.event_date);
      const refundNpr = calculateRefund(Number(booking.total_price_npr || 0), policy.refundPercent);

      const updatedBooking = await client.query(
        `
        UPDATE bookings
        SET status = 'cancelled',
            cancelled_at = NOW(),
            refund_npr = $2,
            cancellation_policy_snapshot = $3
        WHERE id = $1
        RETURNING *
        `,
        [params.id, refundNpr, policy.note]
      );

      await client.query(
        'UPDATE events SET current_participants = GREATEST(0, current_participants - $2) WHERE id = $1',
        [booking.event_id, booking.spots]
      );

      await client.query(
        `
        UPDATE payments
        SET status = CASE WHEN $2 > 0 THEN 'paid' ELSE 'failed' END
        WHERE booking_id = $1 AND status = 'pending'
        `,
        [params.id, refundNpr]
      );

      await client.query('COMMIT');

      const participantEmail = buildBrandedEmail({
        subject: `Booking cancelled: ${booking.title}`,
        appUrl: getAppUrl(),
        headline: 'Booking cancelled',
        subhead: booking.title,
        greetingName: booking.name || 'there',
        bodyHtml: `Your booking for <strong>${booking.title}</strong> was cancelled.<br/>Refund NPR: <strong>${refundNpr}</strong><br/>${policy.note}`,
        bodyText: `Your booking was cancelled. Refund NPR: ${refundNpr}. Policy: ${policy.note}`,
      });
      await sendEmailSafe({
        to: booking.email,
        ...participantEmail,
      });

      if (booking.organizer_email) {
        const organizerEmail = buildBrandedEmail({
          subject: `Booking cancelled: ${booking.title}`,
          appUrl: getAppUrl(),
          headline: 'Booking cancelled',
          subhead: booking.title,
          bodyHtml: `${booking.name || booking.email} cancelled their booking for <strong>${booking.title}</strong>.`,
          bodyText: `${booking.name || booking.email} cancelled their booking.`,
        });
        await sendEmailSafe({
          to: booking.organizer_email,
          ...organizerEmail,
        });
      }

      return NextResponse.json(
        {
          booking: updatedBooking.rows[0],
          refund_npr: refundNpr,
          policy: policy.note,
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
