import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.user_id,
        b.event_id,
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
        u.name as participant_name,
        u.email as participant_email,
        p.id as payment_id,
        p.status as payment_status,
        p.amount_npr,
        p.qr_payload,
        p.created_at as payment_created_at
      FROM bookings b
      JOIN events e ON e.id = b.event_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN LATERAL (
        SELECT id, status, amount_npr, qr_payload, created_at
        FROM payments
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE b.id = $1
      LIMIT 1
      `,
      [params.id]
    );

    const receipt = result.rows[0];
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (auth.role !== 'admin' && receipt.user_id !== auth.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ receipt }, { status: 200 });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}
