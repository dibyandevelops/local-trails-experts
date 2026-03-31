import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const eventRes = await pool.query(
      'SELECT id, host_user_id FROM events WHERE id = $1 LIMIT 1',
      [eventId]
    );
    const event = eventRes.rows[0];
    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }
    const canReview =
      auth.role === 'admin' ||
      (auth.role === 'expert' && event.host_user_id && event.host_user_id === auth.sub);
    if (!canReview) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await pool.query(
      `
      SELECT
        b.id AS booking_id,
        b.spots,
        b.total_price_npr,
        b.status AS booking_status,
        u.id AS participant_user_id,
        u.name AS participant_name,
        u.email AS participant_email,
        p.id AS payment_id,
        p.status AS payment_status,
        p.transaction_reference,
        p.proof_image_url,
        p.proof_submitted_at,
        p.review_note,
        p.verified_at
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      LEFT JOIN LATERAL (
        SELECT id, status, transaction_reference, proof_image_url, proof_submitted_at, review_note, verified_at
        FROM payments
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE b.event_id = $1
        AND b.total_price_npr > 0
      ORDER BY b.created_at DESC
      `,
      [eventId]
    );

    return NextResponse.json({ bookings: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment review bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment review data.' },
      { status: 500 }
    );
  }
}

