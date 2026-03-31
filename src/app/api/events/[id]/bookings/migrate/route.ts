import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request, 'event-booking-migrate', 10, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(
        'SELECT id, email FROM users WHERE id = $1 LIMIT 1',
        [auth.sub]
      );
      const user = userRes.rows[0];
      if (!user?.email) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const eventRes = await client.query(
        `
        SELECT id, price_npr
        FROM events
        WHERE id = $1
        LIMIT 1
        `,
        [eventId]
      );
      const event = eventRes.rows[0];
      if (!event) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const legacyRes = await client.query(
        `
        SELECT id
        FROM event_participants
        WHERE event_id = $1 AND participant_email = $2
        LIMIT 1
        `,
        [eventId, user.email]
      );
      const legacyParticipant = legacyRes.rows[0];
      if (!legacyParticipant) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'No legacy join found for this event.' },
          { status: 404 }
        );
      }

      const totalPrice = Number(event.price_npr || 0);
      const bookingStatus = totalPrice > 0 ? 'pending' : 'confirmed';
      const bookingResult = await client.query(
        `
        INSERT INTO bookings (event_id, user_id, spots, total_price_npr, status)
        VALUES ($1, $2, 1, $3, $4)
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET
          spots = 1,
          total_price_npr = EXCLUDED.total_price_npr,
          status = EXCLUDED.status,
          cancelled_at = NULL,
          cancellation_policy_snapshot = NULL,
          refund_npr = 0
        RETURNING id, event_id, user_id, spots, total_price_npr, status
        `,
        [eventId, auth.sub, totalPrice, bookingStatus]
      );
      const booking = bookingResult.rows[0];

      if (totalPrice > 0) {
        const paymentCheck = await client.query(
          'SELECT id FROM payments WHERE booking_id = $1 LIMIT 1',
          [booking.id]
        );
        if (paymentCheck.rows.length === 0) {
          const qrPayload = JSON.stringify({
            booking_id: booking.id,
            amount_npr: totalPrice,
            currency: 'NPR',
          });
          await client.query(
            `
            INSERT INTO payments (booking_id, amount_npr, status, qr_payload)
            VALUES ($1, $2, 'pending', $3)
            `,
            [booking.id, totalPrice, qrPayload]
          );
        }
      }

      await client.query(
        'DELETE FROM event_participants WHERE id = $1',
        [legacyParticipant.id]
      );

      await client.query('COMMIT');
      return NextResponse.json({ booking }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error migrating legacy event join to booking:', error);
    return NextResponse.json(
      { error: 'Failed to migrate event join.' },
      { status: 500 }
    );
  }
}
