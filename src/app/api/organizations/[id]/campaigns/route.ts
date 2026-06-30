import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization } from '@/lib/organization-access';
import { isAllowedImageUrl } from '@/lib/image-url';

const VALID_STATUSES = new Set([
  'draft',
  'active',
  'looking_for_funds',
  'completed',
  'paused',
  'archived',
]);
const MAX_QR_IMAGE_LENGTH = 650_000;

async function getCampaigns(organizationId: string) {
  const result = await pool.query(
    `
    SELECT fc.*, t.name AS trail_name, t.slug AS trail_slug
    FROM fundraising_campaigns fc
    LEFT JOIN trails t ON t.id = fc.trail_id
    WHERE fc.organization_id = $1
    ORDER BY fc.created_at DESC
    `,
    [organizationId]
  );
  return result.rows;
}

async function requireOrganizationAdmin(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canAdministerOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function isLinkedTrail(organizationId: string, trailId: string) {
  const result = await pool.query(
    'SELECT 1 FROM trail_organizations WHERE organization_id = $1 AND trail_id = $2 LIMIT 1',
    [organizationId, trailId]
  );
  return result.rows.length > 0;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    return NextResponse.json({ campaigns: await getCampaigns(id) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationAdmin(request, id);
    if (!auth) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const trailId = String(body?.trail_id || '').trim();
    const targetAmount = Number(body?.target_amount_npr);
    const status = String(body?.status || 'draft');
    if (!title || !Number.isFinite(targetAmount) || targetAmount <= 0 || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Title, positive target amount, and valid status are required.' }, { status: 400 });
    }
    const qrImageUrl = String(body?.qr_image_url || '').trim();
    if (qrImageUrl && !isAllowedImageUrl(qrImageUrl, MAX_QR_IMAGE_LENGTH)) {
      return NextResponse.json({ error: 'Payment QR image must be a valid image URL or compressed upload.' }, { status: 400 });
    }
    if (trailId && !(await isLinkedTrail(id, trailId))) {
      return NextResponse.json({ error: 'Campaign trail must be linked to the organization.' }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO fundraising_campaigns (
        organization_id, trail_id, title, description, target_amount_npr,
        qr_image_url, payment_note, status, starts_at, ends_at, created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        id,
        trailId || null,
        title,
        String(body?.description || '').trim() || null,
        targetAmount,
        qrImageUrl || null,
        String(body?.payment_note || '').trim() || null,
        status,
        body?.starts_at || null,
        body?.ends_at || null,
        auth.sub,
      ]
    );
    return NextResponse.json({ campaigns: await getCampaigns(id) }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    const body = await request.json();
    const campaignId = String(body?.id || '').trim();
    const status = String(body?.status || '').trim();
    if (!campaignId || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Campaign id and valid status are required.' }, { status: 400 });
    }
    const result = await pool.query(
      `
      UPDATE fundraising_campaigns
      SET status = $3, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
      `,
      [campaignId, id, status]
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    return NextResponse.json({ campaigns: await getCampaigns(id) }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}
