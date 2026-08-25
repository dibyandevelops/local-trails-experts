import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendEmailSafe } from '@/lib/email';
import {
  buildBookingConfirmedEmail,
  buildBrandedEmail,
  getAppUrl,
} from '@/lib/email-templates';
import {
  getEsewaConfig,
  parseEsewaCallbackData,
  verifyEsewaTransaction,
} from '@/lib/esewa';
import {
  acquireIdempotencyLock,
  completeIdempotencyLock,
  releaseIdempotencyLock,
} from '@/lib/idempotency';
import { recordBookingPaymentLedger } from '@/lib/ledger';
import { logger } from '@/lib/logger';

type CallbackData = {
  transaction_uuid?: string;
  status?: string;
  total_amount?: string;
  product_code?: string;
  ref_id?: string;
  transaction_code?: string;
};

async function readCallbackData(request: NextRequest) {
  const searchData = request.nextUrl.searchParams.get('data');
  if (searchData) {
    return parseEsewaCallbackData(searchData) as CallbackData | null;
  }

  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const data = String(formData.get('data') || '');
      if (data) return parseEsewaCallbackData(data) as CallbackData | null;
    } catch {
      return null;
    }
  }
  return null;
}

async function handleCallback(request: NextRequest) {
  const config = getEsewaConfig();
  const baseUrl = config.baseUrl;
  const parsed = await readCallbackData(request);
  if (!parsed?.transaction_uuid) {
    logger.warn('eSewa callback missing transaction_uuid');
    return NextResponse.redirect(
      new URL('/events?payment=failed&reason=missing_transaction', baseUrl)
    );
  }

  const transactionUuid = String(parsed.transaction_uuid).trim();
  const idempotencyKey = `payment:esewa:${transactionUuid}`;

  // Acquire distributed lock to prevent duplicate concurrent processing
  const lock = await acquireIdempotencyLock(idempotencyKey, 60);
  if (lock.status === 'in_flight') {
    logger.warn('eSewa callback in-flight duplicate received', { transactionUuid });
  }

  try {
    const paymentResult = await pool.query(
      `
      SELECT
        p.id, p.amount_npr, p.status, p.booking_id,
        b.event_id, b.user_id,
        e.title, e.event_date, e.organizer_email, e.host_user_id,
        u.name AS participant_name, u.email AS participant_email
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN events e ON e.id = b.event_id
      JOIN users u ON u.id = b.user_id
      WHERE p.transaction_uuid = $1
      ORDER BY p.created_at DESC
      LIMIT 1
      `,
      [transactionUuid]
    );
    const payment = paymentResult.rows[0];
    if (!payment) {
      logger.error('eSewa callback payment record not found in database', null, { transactionUuid });
      return NextResponse.redirect(
        new URL('/events?payment=failed&reason=payment_not_found', baseUrl)
      );
    }

    const eventPath = `/events/${payment.event_id}`;

    // Fast-path for already verified payment
    if (payment.status === 'paid') {
      logger.info('eSewa callback payment already marked as paid', { transactionUuid, paymentId: payment.id });
      return NextResponse.redirect(new URL(`${eventPath}?payment=success`, baseUrl));
    }

    const totalAmount =
      String(parsed.total_amount || '').trim() || String(payment.amount_npr || 0);
    const productCode =
      String(parsed.product_code || '').trim() || config.productCode;

    const verification = await verifyEsewaTransaction({
      productCode,
      totalAmount,
      transactionUuid,
    });

    const isPaid = verification.ok;
    const nextPaymentStatus = isPaid ? 'paid' : 'failed';
    const nextBookingStatus = isPaid ? 'confirmed' : 'pending';
    const gatewayRef = verification.refId || String(parsed.ref_id || '').trim() || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
        UPDATE payments
        SET
          status = $1::varchar,
          transaction_reference = COALESCE($2::varchar, transaction_reference),
          gateway_status = $3::varchar,
          gateway_payload = $4::jsonb,
          paid_at = CASE WHEN $1::varchar = 'paid' THEN NOW() ELSE paid_at END,
          verified_at = CASE WHEN $1::varchar = 'paid' THEN NOW() ELSE verified_at END,
          review_note = CASE
            WHEN $1::varchar = 'paid' THEN COALESCE(review_note, 'Auto-verified via eSewa')
            ELSE COALESCE(review_note, 'eSewa verification failed')
          END
        WHERE id = $5
        `,
        [
          nextPaymentStatus,
          gatewayRef,
          verification.status || 'UNKNOWN',
          JSON.stringify(verification.data || {}),
          payment.id,
        ]
      );

      await client.query(
        `
        UPDATE bookings
        SET status = $1::varchar
        WHERE id = $2
        `,
        [nextBookingStatus, payment.booking_id]
      );

      if (isPaid) {
        try {
          await recordBookingPaymentLedger(client, {
            bookingId: payment.booking_id,
            transactionRef: `tx:esewa:${transactionUuid}`,
            amountNpr: Number(payment.amount_npr || 0),
            expertUserId: payment.host_user_id || null,
          });
        } catch (ledgerError) {
          logger.warn('Failed recording double-entry ledger entry', { error: String(ledgerError) });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const statusParam = isPaid ? 'success' : 'failed';

    if (isPaid) {
      const participantEmailPayload = buildBookingConfirmedEmail({
        appUrl: getAppUrl(),
        title: payment.title,
        participantName: payment.participant_name,
        amountNpr: Number(payment.amount_npr || 0),
        eventId: payment.event_id,
      });
      await sendEmailSafe({
        to: payment.participant_email,
        ...participantEmailPayload,
        dedupeKey: `booking:confirmed:esewa:${payment.booking_id}:${payment.participant_email}`,
      });

      if (
        payment.organizer_email &&
        payment.organizer_email !== payment.participant_email
      ) {
        const organizerEmailPayload = buildBrandedEmail({
          subject: `Booking confirmed (paid): ${payment.title}`,
          appUrl: getAppUrl(),
          headline: 'Participant payment verified',
          subhead: payment.title,
          bodyHtml: `${payment.participant_name || payment.participant_email} has completed payment for <strong>${payment.title}</strong>.<br/><strong>Amount:</strong> NPR ${payment.amount_npr}`,
          bodyText: `${payment.participant_name || payment.participant_email} has completed payment for ${payment.title}. Amount: NPR ${payment.amount_npr}.`,
        });
        await sendEmailSafe({
          to: payment.organizer_email,
          ...organizerEmailPayload,
          dedupeKey: `booking:confirmed:esewa:organizer:${payment.booking_id}:${payment.organizer_email}`,
        });
      }
    }

    await completeIdempotencyLock(idempotencyKey, 200, { status: nextPaymentStatus });
    return NextResponse.redirect(new URL(`${eventPath}?payment=${statusParam}`, baseUrl));
  } catch (error) {
    await releaseIdempotencyLock(idempotencyKey);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleCallback(request);
  } catch (error) {
    logger.error('Error handling eSewa callback (GET)', error);
    const { baseUrl } = getEsewaConfig();
    return NextResponse.redirect(
      new URL('/events?payment=failed&reason=server_error', baseUrl)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleCallback(request);
  } catch (error) {
    logger.error('Error handling eSewa callback (POST)', error);
    const { baseUrl } = getEsewaConfig();
    return NextResponse.redirect(
      new URL('/events?payment=failed&reason=server_error', baseUrl)
    );
  }
}
