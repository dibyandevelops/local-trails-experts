import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/image-url';
import {
  DEFAULT_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE,
  getOrganizationSubscriptionSettings,
} from '@/lib/organization-subscription-settings';

const MAX_QR_IMAGE_LENGTH = 650_000;
const MAX_PAYMENT_NOTE_LENGTH = 600;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function requireAdmin(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  return auth?.role === 'admin' ? auth : null;
}

export async function GET() {
  try {
    return NextResponse.json(
      { settings: await getOrganizationSubscriptionSettings() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching organization subscription settings:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription settings.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const paymentQrImageUrl = cleanText(body.payment_qr_image_url, MAX_QR_IMAGE_LENGTH);
    const paymentNote =
      cleanText(body.payment_note, MAX_PAYMENT_NOTE_LENGTH) ||
      DEFAULT_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE;
    const isPaymentEnabled = Boolean(body.is_payment_enabled);

    if (paymentQrImageUrl && !isAllowedImageUrl(paymentQrImageUrl, MAX_QR_IMAGE_LENGTH)) {
      return NextResponse.json(
        { error: 'Payment QR must be a valid HTTPS image URL or supported image upload.' },
        { status: 400 }
      );
    }
    if (isPaymentEnabled && !paymentQrImageUrl) {
      return NextResponse.json(
        { error: 'Upload or add a payment QR before enabling subscription payments.' },
        { status: 400 }
      );
    }

    await pool.query(
      `
      INSERT INTO platform_subscription_settings (
        id,
        payment_qr_image_url,
        payment_note,
        is_payment_enabled,
        updated_by_admin_id
      )
      VALUES (TRUE, $1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        payment_qr_image_url = EXCLUDED.payment_qr_image_url,
        payment_note = EXCLUDED.payment_note,
        is_payment_enabled = EXCLUDED.is_payment_enabled,
        updated_by_admin_id = EXCLUDED.updated_by_admin_id,
        updated_at = NOW()
      `,
      [paymentQrImageUrl, paymentNote, isPaymentEnabled, auth.sub]
    );

    return NextResponse.json({ settings: await getOrganizationSubscriptionSettings() });
  } catch (error) {
    console.error('Error updating organization subscription settings:', error);
    return NextResponse.json({ error: 'Failed to update subscription settings.' }, { status: 500 });
  }
}
