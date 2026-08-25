import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import {
  buildBookingConfirmedEmail,
  buildBrandedEmail,
  getAppUrl,
} from '@/lib/email-templates';
import {
  acquireIdempotencyLock,
  completeIdempotencyLock,
  releaseIdempotencyLock,
} from '@/lib/idempotency';
import { recordBookingPaymentLedger } from '@/lib/ledger';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paymentId } = await params;
  const idempotencyKey = `payment:review:${paymentId}`;

  try {
    const limited = await rateLimit(request, 'payment-review', 20, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || '').trim(); // 'approve' | 'reject'
    const reviewNote = String(body?.review_note || '').trim();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid review action.' }, { status: 400 });
    }

    const lock = await acquireIdempotencyLock(idempotencyKey, 30);
    if (lock.status === 'replayed') {
      return NextResponse.json(lock.responseBody, { status: lock.responseCode });
    }

    const paymentRes = await pool.query(
      `
      SELECT
        p.id, p.status, p.booking_id, p.amount_npr,
        b.event_id, b.status AS booking_status,
        e.host_user_id, e.title, e.organizer_email,
        u.name AS participant_name, u.email AS participant_email
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN events e ON e.id = b.event_id
      JOIN users u ON u.id = b.user_id
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

    // If already approved/paid, return directly
    if (payment.status === 'paid' && action === 'approve') {
      return NextResponse.json(
        { payment: { id: payment.id, status: 'paid', review_note: 'Already approved' } },
        { status: 200 }
      );
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

      if (action === 'approve') {
        try {
          await recordBookingPaymentLedger(client, {
            bookingId: payment.booking_id,
            transactionRef: `tx:manual:${paymentId}`,
            amountNpr: Number(payment.amount_npr || 0),
            expertUserId: payment.host_user_id || null,
          });
        } catch (ledgerError) {
          logger.warn('Failed recording double-entry ledger entry', { error: String(ledgerError) });
        }
      }

      await client.query('COMMIT');

      if (action === 'approve') {
        const participantEmailPayload = buildBookingConfirmedEmail({
          appUrl: getAppUrl(),
          title: payment.title,
          participantName: payment.participant_name,
          eventId: payment.event_id,
        });
        await sendEmailSafe({
          to: payment.participant_email,
          ...participantEmailPayload,
          dedupeKey: `booking:confirmed:manual:${payment.booking_id}:${payment.participant_email}`,
        });

        if (
          payment.organizer_email &&
          payment.organizer_email !== payment.participant_email
        ) {
          const organizerEmailPayload = buildBrandedEmail({
            subject: `Booking confirmed (manual review): ${payment.title}`,
            appUrl: getAppUrl(),
            headline: 'Participant payment approved',
            subhead: payment.title,
            bodyHtml: `${payment.participant_name || payment.participant_email} payment proof was approved for <strong>${payment.title}</strong>.`,
            bodyText: `${payment.participant_name || payment.participant_email} payment proof was approved for ${payment.title}.`,
          });
          await sendEmailSafe({
            to: payment.organizer_email,
            ...organizerEmailPayload,
            dedupeKey: `booking:confirmed:manual:organizer:${payment.booking_id}:${payment.organizer_email}`,
          });
        }
      }

      const responsePayload = { payment: updatedPayment.rows[0] };
      await completeIdempotencyLock(idempotencyKey, 200, responsePayload);
      return NextResponse.json(responsePayload, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await releaseIdempotencyLock(idempotencyKey);
    logger.error('Error reviewing payment proof', error, { paymentId });
    return NextResponse.json(
      { error: 'Failed to review payment proof.' },
      { status: 500 }
    );
  }
}
