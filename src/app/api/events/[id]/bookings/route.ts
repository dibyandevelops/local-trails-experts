import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ booking: null }, { status: 200 });
    }

    const { id: eventId } = await params;
    const result = await pool.query(
      `
      SELECT
        b.id, b.event_id, b.user_id, b.spots, b.total_price_npr, b.status,
        b.refund_npr, b.cancelled_at, b.cancellation_policy_snapshot, b.created_at,
        p.id as payment_id,
        p.status as payment_status,
        p.transaction_reference,
        p.proof_image_url,
        p.proof_submitted_at,
        p.review_note,
        p.verified_at
      FROM bookings b
      LEFT JOIN LATERAL (
        SELECT id, status, transaction_reference, proof_image_url, proof_submitted_at, review_note, verified_at
        FROM payments
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE event_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [eventId, auth.sub]
    );

    return NextResponse.json({ booking: result.rows[0] || null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event booking:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request, 'event-booking', 10, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'participant') {
      return NextResponse.json(
        { error: 'Only participants can create bookings' },
        { status: 403 }
      );
    }

    const { id: eventId } = await params;
    const body = await request.json();
    const spots = Number(body.spots || 1);

    if (!Number.isFinite(spots) || spots < 1) {
      return NextResponse.json({ error: 'spots must be at least 1' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1',
        [auth.sub]
      );
      const user = userResult.rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const eventResult = await client.query(
        `
        SELECT id, title, event_date, max_participants, current_participants,
               price_npr, organizer_email
        FROM events
        WHERE id = $1
        LIMIT 1
        `,
        [eventId]
      );
      const event = eventResult.rows[0];
      if (!event) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const existing = await client.query(
        'SELECT id, status FROM bookings WHERE event_id = $1 AND user_id = $2 LIMIT 1',
        [eventId, auth.sub]
      );
      if (existing.rows.length > 0 && existing.rows[0].status !== 'cancelled') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Booking already exists' }, { status: 409 });
      }

      const remainingSlots = Number(event.max_participants) - Number(event.current_participants);
      if (spots > remainingSlots) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Not enough spots available' }, { status: 400 });
      }

      const totalPrice = Number(event.price_npr || 0) * spots;
      const bookingStatus: 'pending' | 'confirmed' = totalPrice > 0 ? 'pending' : 'confirmed';

      const booking = await client.query(
        `
        INSERT INTO bookings (event_id, user_id, spots, total_price_npr, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET
          spots = EXCLUDED.spots,
          total_price_npr = EXCLUDED.total_price_npr,
          status = EXCLUDED.status,
          cancelled_at = NULL,
          cancellation_policy_snapshot = NULL,
          refund_npr = 0
        RETURNING id, event_id, user_id, spots, total_price_npr, status,
                  refund_npr, cancelled_at, cancellation_policy_snapshot, created_at
        `,
        [eventId, auth.sub, spots, totalPrice, bookingStatus]
      );

      await client.query(
        'UPDATE events SET current_participants = current_participants + $2 WHERE id = $1',
        [eventId, spots]
      );

      let payment = null;
      if (totalPrice > 0) {
        const qrPayload = JSON.stringify({
          booking_id: booking.rows[0].id,
          amount_npr: totalPrice,
          currency: 'NPR',
        });

        const paymentResult = await client.query(
          `
          INSERT INTO payments (booking_id, amount_npr, status, qr_payload)
          VALUES ($1, $2, 'pending', $3)
          RETURNING *
          `,
          [booking.rows[0].id, totalPrice, qrPayload]
        );
        payment = paymentResult.rows[0];
      }

      await client.query('COMMIT');

      const participantEmail = buildBrandedEmail({
        subject: `Booking ${bookingStatus === 'confirmed' ? 'Confirmed' : 'Created'}: ${event.title}`,
        appUrl: getAppUrl(),
        headline: `Booking ${bookingStatus === 'confirmed' ? 'confirmed' : 'created'}`,
        subhead: event.title,
        greetingName: user.name || 'there',
        bodyHtml: `Your booking for <strong>${event.title}</strong> is <strong>${bookingStatus}</strong>.<br/>Total NPR: <strong>${totalPrice}</strong>.`,
        bodyText: `Your booking for ${event.title} is ${bookingStatus}. Total NPR: ${totalPrice}.`,
      });
      await sendEmailSafe({
        to: user.email,
        ...participantEmail,
        dedupeKey: `booking:create:${eventId}:${user.email}:${bookingStatus}:${spots}`,
      });

      if (event.organizer_email && event.organizer_email !== user.email) {
        const organizerEmailPayload = buildBrandedEmail({
          subject: `New booking: ${event.title}`,
          appUrl: getAppUrl(),
          headline: 'New booking received',
          subhead: event.title,
          bodyHtml: `${user.name || user.email} booked ${spots} spot(s) for <strong>${event.title}</strong>.`,
          bodyText: `${user.name || user.email} booked ${spots} spot(s) for ${event.title}.`,
        });
        await sendEmailSafe({
          to: event.organizer_email,
          ...organizerEmailPayload,
          dedupeKey: `booking:organizer:${eventId}:${event.organizer_email}:${user.email}:${spots}`,
        });
      }

      return NextResponse.json({ booking: booking.rows[0], payment }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
