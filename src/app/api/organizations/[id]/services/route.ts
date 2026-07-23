import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canOperateOrganization, canUseOrganizationRevenueFeatures } from '@/lib/organization-access';
import { isAllowedImageUrl } from '@/lib/image-url';
import { inferOrganizationServiceCategory } from '@/lib/organization-service-category';

function normalizeHttpUrl(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

async function requireOperator(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canOperateOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getServices(organizationId: string) {
  const result = await pool.query(
    `SELECT * FROM organization_services WHERE organization_id = $1 ORDER BY is_active DESC, created_at DESC`,
    [organizationId]
  );
  return result.rows.map((row) => ({
    ...row,
    price_npr: row.price_npr === null ? null : Number(row.price_npr),
  }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOperator(request, id))) {
      return NextResponse.json({ error: 'Organization expert access required.' }, { status: 403 });
    }
    return NextResponse.json({ services: await getServices(id) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireOperator(request, id);
    if (!auth) {
      return NextResponse.json({ error: 'Organization expert access required.' }, { status: 403 });
    }
    if (!(await canUseOrganizationRevenueFeatures(id))) {
      return NextResponse.json(
        { error: 'A verified organization with an active subscription is required to publish services.' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const category = inferOrganizationServiceCategory(`${title}\n${description}`);
    const priceRaw = body?.price_npr;
    const priceNpr = priceRaw === '' || priceRaw === null || priceRaw === undefined ? null : Number(priceRaw);
    const imageUrl = String(body?.image_url || '').trim() || null;
    const websiteRaw = String(body?.website_url || '').trim();
    const websiteUrl = normalizeHttpUrl(websiteRaw);
    if (!title) {
      return NextResponse.json({ error: 'Service title is required.' }, { status: 400 });
    }
    if (title.length > 160) {
      return NextResponse.json({ error: 'Service title must be 160 characters or fewer.' }, { status: 400 });
    }
    if (priceNpr !== null && (!Number.isFinite(priceNpr) || priceNpr < 0)) {
      return NextResponse.json({ error: 'Price must be zero or greater.' }, { status: 400 });
    }
    if (imageUrl && !isAllowedImageUrl(imageUrl, 650_000)) {
      return NextResponse.json({ error: 'Service image must be a valid HTTPS URL or supported upload.' }, { status: 400 });
    }
    if (websiteRaw && !websiteUrl) {
      return NextResponse.json({ error: 'Service website must be a valid HTTP or HTTPS URL.' }, { status: 400 });
    }
    await pool.query(
      `
      INSERT INTO organization_services (
        organization_id, created_by_user_id, category, title, description,
        price_npr, price_note, location, contact_email, contact_phone,
        website_url, image_url, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
      `,
      [
        id,
        auth.sub,
        category,
        title,
        description || null,
        priceNpr,
        String(body?.price_note || '').trim() || null,
        String(body?.location || '').trim() || null,
        String(body?.contact_email || '').trim() || null,
        String(body?.contact_phone || '').trim() || null,
        websiteUrl,
        imageUrl,
      ]
    );
    return NextResponse.json({ services: await getServices(id) }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization service:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOperator(request, id))) {
      return NextResponse.json({ error: 'Organization expert access required.' }, { status: 403 });
    }
    const body = await request.json();
    const serviceId = String(body?.service_id || '').trim();
    if (!serviceId || typeof body?.is_active !== 'boolean') {
      return NextResponse.json({ error: 'Service id and active state are required.' }, { status: 400 });
    }
    if (body.is_active && !(await canUseOrganizationRevenueFeatures(id))) {
      return NextResponse.json(
        { error: 'A verified organization with an active subscription is required to activate services.' },
        { status: 403 }
      );
    }
    const result = await pool.query(
      `UPDATE organization_services SET is_active = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [serviceId, id, body.is_active]
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    return NextResponse.json({ services: await getServices(id) }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}
