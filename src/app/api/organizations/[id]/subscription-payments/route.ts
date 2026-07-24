import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization } from '@/lib/organization-access';
import { isAllowedImageUrl } from '@/lib/image-url';
import {
  ORGANIZATION_SUBSCRIPTION_PRICE_NPR,
  ORGANIZATION_SUBSCRIPTION_PROOF_MAX_BYTES,
  getOrganizationSubscriptionAmount,
  isValidOrganizationSubscriptionMonths,
} from '@/lib/organization-subscriptions';
import { getOrganizationSubscriptionSettings } from '@/lib/organization-subscription-settings';
import { rateLimit } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

async function requireOrganizationAdmin(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canAdministerOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getPayments(organizationId: string) {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.amount_npr::text,
      p.months,
      p.transaction_reference,
      p.proof_image_url,
      p.status,
      p.admin_note,
      p.reviewed_at::text,
      p.created_at::text,
      reviewer.name AS reviewed_by_name
    FROM organization_subscription_payments p
    LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_admin_id
    WHERE p.organization_id = $1
    ORDER BY p.created_at DESC
    LIMIT 50
    `,
    [organizationId]
  );
  return result.rows;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    return NextResponse.json({ payments: await getPayments(id), monthly_price_npr: ORGANIZATION_SUBSCRIPTION_PRICE_NPR });
  } catch (error) {
    console.error('Error fetching organization subscription payments:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription payments.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const limited = await rateLimit(request, 'organization-subscription-payment', 6, 60);
    if (limited) return limited;

    const { id } = await params;
    const auth = await requireOrganizationAdmin(request, id);
    if (!auth) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    const settings = await getOrganizationSubscriptionSettings();
    if (!settings.is_payment_enabled || !settings.payment_qr_image_url) {
      return NextResponse.json(
        { error: 'Subscription payments are not open yet.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const months = Number(body.months || 1);
    const amountNpr = Number(body.amount_npr || ORGANIZATION_SUBSCRIPTION_PRICE_NPR);
    const transactionReference = cleanText(body.transaction_reference, 160);
    const proofImageUrl = cleanText(body.proof_image_url, ORGANIZATION_SUBSCRIPTION_PROOF_MAX_BYTES);

    if (!isValidOrganizationSubscriptionMonths(months)) {
      return NextResponse.json({ error: 'Choose 1 to 12 subscription months.' }, { status: 400 });
    }
    if (amountNpr !== getOrganizationSubscriptionAmount(months)) {
      return NextResponse.json(
        { error: `Subscription payment must be NPR ${ORGANIZATION_SUBSCRIPTION_PRICE_NPR.toLocaleString()} per month.` },
        { status: 400 }
      );
    }
    if (!proofImageUrl || !isAllowedImageUrl(proofImageUrl, ORGANIZATION_SUBSCRIPTION_PROOF_MAX_BYTES)) {
      return NextResponse.json({ error: 'Upload a valid payment screenshot under 2.5MB.' }, { status: 400 });
    }
    const pendingResult = await pool.query(
      `
      SELECT id
      FROM organization_subscription_payments
      WHERE organization_id = $1 AND status = 'pending'
      LIMIT 1
      `,
      [id]
    );
    if (pendingResult.rows[0]) {
      return NextResponse.json(
        { error: 'A subscription payment is already pending review for this organization.' },
        { status: 409 }
      );
    }

    await pool.query(
      `
      INSERT INTO organization_subscription_payments (
        organization_id,
        submitted_by_user_id,
        amount_npr,
        months,
        transaction_reference,
        proof_image_url,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      `,
      [id, auth.sub, amountNpr, months, transactionReference, proofImageUrl]
    );

    return NextResponse.json({ payments: await getPayments(id), monthly_price_npr: ORGANIZATION_SUBSCRIPTION_PRICE_NPR }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'A subscription payment is already pending review for this organization.' },
        { status: 409 }
      );
    }
    console.error('Error submitting organization subscription payment:', error);
    return NextResponse.json({ error: 'Failed to submit subscription payment.' }, { status: 500 });
  }
}
