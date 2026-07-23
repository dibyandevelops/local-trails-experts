import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization, canUseOrganizationRevenueFeatures } from '@/lib/organization-access';
import { isAllowedImageUrl } from '@/lib/image-url';

type RouteContext = { params: Promise<{ id: string }> };
const MAX_PROMOTION_IMAGE_LENGTH = 650_000;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeHttpUrl(value: unknown) {
  const text = cleanText(value, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isValidDateOnly(value: string) {
  if (!DATE_ONLY_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function requireOrganizationAdmin(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canAdministerOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getPromotions(organizationId: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      cta_label,
      cta_url,
      image_url,
      starts_at::text,
      ends_at::text,
      is_active,
      created_at::text
    FROM organization_promotions
    WHERE organization_id = $1
    ORDER BY starts_at DESC, created_at DESC
    LIMIT 24
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
    return NextResponse.json({ promotions: await getPromotions(id) });
  } catch (error) {
    console.error('Error fetching organization promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationAdmin(request, id);
    if (!auth) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    if (!(await canUseOrganizationRevenueFeatures(id))) {
      return NextResponse.json(
        { error: 'A verified organization with an active subscription is required to publish monthly promotions.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const title = cleanText(body.title, 140);
    const description = cleanText(body.description, 800);
    const ctaLabel = cleanText(body.cta_label, 80);
    const ctaUrl = normalizeHttpUrl(body.cta_url);
    const imageUrl = cleanText(body.image_url, MAX_PROMOTION_IMAGE_LENGTH);
    const startsAt = cleanText(body.starts_at, 20) || new Date().toISOString().slice(0, 10);
    const endsAt = cleanText(body.ends_at, 20);

    if (!title) {
      return NextResponse.json({ error: 'Promotion title is required.' }, { status: 400 });
    }
    if (!isValidDateOnly(startsAt)) {
      return NextResponse.json({ error: 'Promotion start date is invalid.' }, { status: 400 });
    }
    if (endsAt && !isValidDateOnly(endsAt)) {
      return NextResponse.json({ error: 'Promotion end date is invalid.' }, { status: 400 });
    }
    if (endsAt && endsAt < startsAt) {
      return NextResponse.json({ error: 'Promotion end date must be after the start date.' }, { status: 400 });
    }
    if (body.cta_url && !ctaUrl) {
      return NextResponse.json({ error: 'CTA URL must be a valid HTTP or HTTPS URL.' }, { status: 400 });
    }
    if (imageUrl && !isAllowedImageUrl(imageUrl, MAX_PROMOTION_IMAGE_LENGTH)) {
      return NextResponse.json({ error: 'Promotion image must be a valid HTTPS URL or supported upload.' }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO organization_promotions (
        organization_id,
        created_by_user_id,
        title,
        description,
        cta_label,
        cta_url,
        image_url,
        starts_at,
        ends_at,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, TRUE)
      `,
      [id, auth.sub, title, description, ctaLabel, ctaUrl, imageUrl || null, startsAt, endsAt]
    );

    return NextResponse.json({ promotions: await getPromotions(id) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'This organization already has an active promotion for that month.' },
        { status: 409 }
      );
    }
    console.error('Error creating organization promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const promotionId = String(body.promotion_id || '').trim();
    if (!promotionId || typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'Promotion id and active state are required.' }, { status: 400 });
    }
    if (body.is_active && !(await canUseOrganizationRevenueFeatures(id))) {
      return NextResponse.json(
        { error: 'A verified organization with an active subscription is required to activate promotions.' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
      UPDATE organization_promotions
      SET is_active = $3, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
      `,
      [promotionId, id, body.is_active]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Promotion not found.' }, { status: 404 });
    }
    return NextResponse.json({ promotions: await getPromotions(id) });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'This organization already has an active promotion for that month.' },
        { status: 409 }
      );
    }
    console.error('Error updating organization promotion:', error);
    return NextResponse.json({ error: 'Failed to update promotion.' }, { status: 500 });
  }
}
