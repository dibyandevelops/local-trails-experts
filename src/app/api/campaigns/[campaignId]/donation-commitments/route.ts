import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const SUPPORTABLE_STATUSES = new Set(['active', 'looking_for_funds']);

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  if (!next) return null;
  return next.slice(0, maxLength);
}

function isEmail(value: string | null) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function isValidProofImage(value: string | null) {
  if (!value) return false;
  return /^data:image\/(png|jpe?g|webp);base64,/i.test(value) && value.length <= 2_500_000;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const limited = await rateLimit(request, 'campaign-donation-commitment', 8, 60);
    if (limited) return limited;

    const { campaignId } = await params;
    const campaignIdValue = (campaignId || '').trim();
    if (!campaignIdValue) {
      return NextResponse.json({ error: 'Campaign id is required.' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const amountNpr = Number(body.amount_npr);
    const paidAmountNpr = Number(body.paid_amount_npr || amountNpr);
    const supporterName = cleanText(body.supporter_name, 120);
    const supporterEmail = cleanText(body.supporter_email, 180);
    const message = cleanText(body.message, 1000);
    const transactionReference = cleanText(body.transaction_reference, 160);
    const proofImageUrl = cleanText(body.proof_image_url, 2_500_000);
    const wantsProgressUpdates = Boolean(body.wants_progress_updates);

    if (!Number.isFinite(amountNpr) || amountNpr <= 0) {
      return NextResponse.json({ error: 'Donation amount must be greater than 0.' }, { status: 400 });
    }
    if (!Number.isFinite(paidAmountNpr) || paidAmountNpr <= 0) {
      return NextResponse.json({ error: 'Paid amount must be greater than 0.' }, { status: 400 });
    }
    if (supporterEmail && !isEmail(supporterEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (wantsProgressUpdates && !supporterEmail) {
      return NextResponse.json(
        { error: 'Email is required to receive campaign progress updates.' },
        { status: 400 }
      );
    }
    if (!isValidProofImage(proofImageUrl)) {
      return NextResponse.json(
        { error: 'Please upload a valid payment screenshot under 2.5MB.' },
        { status: 400 }
      );
    }

    const campaignResult = await pool.query(
      `
      SELECT id, status
      FROM fundraising_campaigns
      WHERE id = $1
      LIMIT 1
      `,
      [campaignIdValue]
    );
    const campaign = campaignResult.rows[0] as { id: string; status: string } | undefined;
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }
    if (!SUPPORTABLE_STATUSES.has(campaign.status)) {
      return NextResponse.json(
        { error: 'This campaign is not accepting donations right now.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO campaign_donation_commitments (
        campaign_id,
        supporter_name,
        supporter_email,
        amount_npr,
        paid_amount_npr,
        message,
        wants_progress_updates,
        transaction_reference,
        proof_image_url,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'proof_submitted')
      RETURNING id, campaign_id, amount_npr, paid_amount_npr, wants_progress_updates, status, created_at
      `,
      [
        campaignIdValue,
        supporterName,
        supporterEmail,
        amountNpr,
        paidAmountNpr,
        message,
        wantsProgressUpdates,
        transactionReference,
        proofImageUrl,
      ]
    );

    return NextResponse.json({ commitment: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign donation commitment:', error);
    return NextResponse.json(
      { error: 'Failed to submit donation commitment.' },
      { status: 500 }
    );
  }
}
