import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';
import { sendEmailSafe } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = await request.json().catch(() => ({}));
    const bookingId = String(body?.booking_id || '').trim();
    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id is required.' }, { status: 400 });
    }

    const eventRes = await pool.query(
      'SELECT id, title, host_user_id FROM events WHERE id = $1 LIMIT 1',
      [eventId]
    );
    const event = eventRes.rows[0];
    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const canManage =
      auth.role === 'admin' ||
      (auth.role === 'expert' && event.host_user_id && event.host_user_id === auth.sub);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bookingRes = await pool.query(
      `
      SELECT
        b.id AS booking_id,
        b.event_id,
        b.status AS booking_status,
        b.total_price_npr,
        u.name AS participant_name,
        u.email AS participant_email,
        p.status AS payment_status
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      LEFT JOIN LATERAL (
        SELECT status
        FROM payments
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE b.id = $1
      LIMIT 1
      `,
      [bookingId]
    );
    const booking = bookingRes.rows[0];
    if (!booking || booking.event_id !== eventId) {
      return NextResponse.json({ error: 'Booking not found for this event.' }, { status: 404 });
    }

    if (!booking.participant_email) {
      return NextResponse.json({ error: 'Participant email is not available.' }, { status: 400 });
    }
    if (booking.booking_status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is cancelled.' }, { status: 400 });
    }
    if (Number(booking.total_price_npr || 0) <= 0) {
      return NextResponse.json({ error: 'No payment is required for this booking.' }, { status: 400 });
    }
    if (booking.payment_status === 'paid' || booking.payment_status === 'refunded') {
      return NextResponse.json({ error: 'Payment is already completed.' }, { status: 400 });
    }

    const appUrl = getAppUrl();
    const eventUrl = `${appUrl}/events/${eventId}`;
    const amount = Number(booking.total_price_npr || 0);
    const emailPayload = buildBrandedEmail({
      subject: `Payment reminder: ${event.title}`,
      appUrl,
      headline: 'Payment reminder',
      subhead: event.title,
      greetingName: booking.participant_name || undefined,
      bodyHtml:
        `Your booking is waiting for payment verification.` +
        `<br/><strong>Amount due:</strong> NPR ${amount}` +
        `<br/>Please complete payment and upload your proof screenshot.`,
      bodyText: `Payment reminder for ${event.title}. Amount due: NPR ${amount}.`,
      ctas: [
        { label: 'Pay for this event', href: eventUrl, variant: 'primary' },
        { label: 'View event details', href: eventUrl, variant: 'secondary' },
      ],
      profilePath: '/participants/me',
    });

    const dedupeKey = `payment-reminder:${booking.booking_id}:${new Date()
      .toISOString()
      .slice(0, 10)}`;
    const result = await sendEmailSafe({
      to: booking.participant_email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      dedupeKey,
    });

    return NextResponse.json(
      {
        success: true,
        skipped: Boolean((result as { skipped?: boolean }).skipped),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error requesting booking payment reminder:', error);
    return NextResponse.json({ error: 'Failed to send payment reminder.' }, { status: 500 });
  }
}
