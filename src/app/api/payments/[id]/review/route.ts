import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request, 'payment-review', 20, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: paymentId } = await params;
    const body = await request.json();
    const action = String(body?.action || '').trim(); // 'approve' | 'reject'
    const reviewNote = String(body?.review_note || '').trim();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });
    }

    const paymentRes = await pool.query(
      `
      SELECT p.id, p.status, p.booking_id, b.event_id, b.status AS booking_status, e.host_user_id
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN events e ON e.id = b.event_id
      WHERE p.id = $1
      LIMIT 1
      `,
      [paymentId]
    );
    const payment = paymentRes.rows[0];
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
    }

    const canReview =
      auth.role === 'admin' ||
      (auth.role === 'expert' && payment.host_user_id === auth.sub);
    if (!canReview) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nextPaymentStatus = action === 'approve' ? 'paid' : 'failed';
    const nextBookingStatus = action === 'approve' ? 'confirmed' : 'pending';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatedPayment = await client.query(
        `
        UPDATE payments
        SET
          status = $1,
          review_note = $2,
          verified_by_user_id = $3,
          verified_at = NOW()
        WHERE id = $4
        RETURNING id, status, review_note, verified_at
        `,
        [nextPaymentStatus, reviewNote || null, auth.sub, paymentId]
      );

      await client.query(
        `
        UPDATE bookings
        SET status = $1
        WHERE id = $2
        `,
        [nextBookingStatus, payment.booking_id]
      );

      await client.query('COMMIT');
      return NextResponse.json({ payment: updatedPayment.rows[0] }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reviewing payment proof:', error);
    return NextResponse.json(
      { error: 'Failed to review payment proof.' },
      { status: 500 }
    );
  }
}

