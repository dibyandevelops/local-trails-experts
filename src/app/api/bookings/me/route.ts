import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.event_id,
        b.user_id,
        b.spots,
        b.total_price_npr,
        b.status,
        b.refund_npr,
        b.cancelled_at,
        b.cancellation_policy_snapshot,
        b.created_at,
        e.title as event_title,
        e.event_date,
        e.city,
        p.id as payment_id,
        p.status as payment_status,
        p.amount_npr,
        p.qr_payload
      FROM bookings b
      JOIN events e ON e.id = b.event_id
      LEFT JOIN LATERAL (
        SELECT id, status, amount_npr, qr_payload
        FROM payments
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      `,
      [auth.sub]
    );

    return NextResponse.json({ bookings: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
