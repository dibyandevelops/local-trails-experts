import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { isAllowedImageUrl } from '@/lib/image-url';

const MAX_PROOF_IMAGE_URL_LENGTH = 350_000;
const MAX_TRANSACTION_REFERENCE_LENGTH = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = await rateLimit(request, 'booking-payment-proof', 10, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const transactionReference = String(body?.transaction_reference || '').trim();
    const proofImageUrl = String(body?.proof_image_url || '').trim();

    if (!transactionReference) {
      return NextResponse.json(
        { error: 'Transaction reference is required.' },
        { status: 400 }
      );
    }
    if (!proofImageUrl) {
      return NextResponse.json(
        { error: 'Payment proof image is required.' },
        { status: 400 }
      );
    }
    if (transactionReference.length > MAX_TRANSACTION_REFERENCE_LENGTH) {
      return NextResponse.json(
        { error: 'Transaction reference is too long.' },
        { status: 400 }
      );
    }
    if (!isAllowedImageUrl(proofImageUrl, MAX_PROOF_IMAGE_URL_LENGTH)) {
      return NextResponse.json(
        { error: 'Payment proof must be a valid image upload or HTTPS image URL.' },
        { status: 400 }
      );
    }

    const bookingRes = await pool.query(
      `
      SELECT id, user_id, event_id, total_price_npr, status
      FROM bookings
      WHERE id = $1
      LIMIT 1
      `,
      [bookingId]
    );
    const booking = bookingRes.rows[0];
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    if (booking.user_id !== auth.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (Number(booking.total_price_npr || 0) <= 0) {
      return NextResponse.json(
        { error: 'This booking does not require payment.' },
        { status: 400 }
      );
    }

    const paymentRes = await pool.query(
      `
      SELECT id, status
      FROM payments
      WHERE booking_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [bookingId]
    );
    const payment = paymentRes.rows[0];
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }
    if (payment.status === 'paid' || payment.status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment is already verified.' },
        { status: 409 }
      );
    }

    const updated = await pool.query(
      `
      UPDATE payments
      SET
        transaction_reference = $1,
        proof_image_url = $2,
        proof_submitted_at = NOW(),
        review_note = NULL
      WHERE id = $3
      RETURNING id, status, transaction_reference, proof_image_url, proof_submitted_at, review_note, verified_at
      `,
      [transactionReference, proofImageUrl, payment.id]
    );

    return NextResponse.json({ payment: updated.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error submitting payment proof:', error);
    return NextResponse.json(
      { error: 'Failed to submit payment proof.' },
      { status: 500 }
    );
  }
}
