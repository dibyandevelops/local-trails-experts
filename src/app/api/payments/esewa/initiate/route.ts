import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { buildEsewaInitiatePayload, getEsewaConfig } from '@/lib/esewa';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'esewa-initiate', 20, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = getEsewaConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        { error: 'eSewa is not configured on server.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = String(body?.booking_id || '').trim();
    if (!bookingId) {
      return NextResponse.json(
        { error: 'booking_id is required.' },
        { status: 400 }
      );
    }

    const bookingResult = await pool.query(
      `
      SELECT
        b.id, b.user_id, b.event_id, b.total_price_npr, b.status,
        e.title
      FROM bookings b
      JOIN events e ON e.id = b.event_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [bookingId]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    if (booking.user_id !== auth.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const totalAmount = Number(booking.total_price_npr || 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'This booking does not require payment.' },
        { status: 400 }
      );
    }
    if (booking.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Booking is already confirmed.' },
        { status: 409 }
      );
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cancelled booking cannot be paid.' },
        { status: 409 }
      );
    }

    const paymentResult = await pool.query(
      `
      SELECT id, status, transaction_uuid
      FROM payments
      WHERE booking_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [bookingId]
    );

    if (!paymentResult.rows[0]) {
      return NextResponse.json(
        { error: 'Payment record not found for this booking.' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];
    if (payment.status === 'paid' || payment.status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment already completed for this booking.' },
        { status: 409 }
      );
    }

    const transactionUuid =
      payment.transaction_uuid ||
      `${bookingId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    await pool.query(
      `
      UPDATE payments
      SET
        provider = 'esewa',
        transaction_uuid = $1,
        gateway_status = 'INITIATED',
        initiated_at = NOW(),
        review_note = NULL
      WHERE id = $2
      `,
      [transactionUuid, payment.id]
    );

    const successUrl = `${config.baseUrl}/api/payments/esewa/callback`;
    const failureUrl = `${config.baseUrl}/api/payments/esewa/callback`;

    const esewaPayload = buildEsewaInitiatePayload({
      amountNpr: totalAmount,
      taxAmountNpr: 0,
      transactionUuid,
      successUrl,
      failureUrl,
    });

    return NextResponse.json(
      {
        checkout_url: config.checkoutUrl,
        fields: esewaPayload,
        booking_id: bookingId,
        event_id: booking.event_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initiating eSewa payment:', error);
    return NextResponse.json(
      { error: 'Failed to initiate eSewa payment.' },
      { status: 500 }
    );
  }
}
