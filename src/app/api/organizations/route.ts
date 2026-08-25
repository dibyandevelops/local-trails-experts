import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/image-url';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_STATUSES = new Set(['inactive', 'trialing', 'active', 'past_due', 'cancelled']);
const SUBSCRIPTION_PLANS = new Set(['free', 'starter', 'partner', 'pro']);

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'orgs-list', 60, 60);
  if (limited) return limited;
  try {
    const auth = getAuthFromRequest(request);
    const isPlatformAdmin = auth?.role === 'admin';
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim();
    const city = (searchParams.get('city') || '').trim();
    const verified = searchParams.get('verified');
    const active = searchParams.get('active');

    const where: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (!isPlatformAdmin) {
      where.push('o.is_active = TRUE');
    }

    if (query) {
      where.push(`(o.name ILIKE $${idx} OR o.slug ILIKE $${idx} OR COALESCE(o.tagline, '') ILIKE $${idx})`);
      values.push(`%${query}%`);
      idx += 1;
    }
    if (city) {
      where.push(`o.city ILIKE $${idx}`);
      values.push(`%${city}%`);
      idx += 1;
    }
    if (verified === 'true' || verified === 'false') {
      where.push(`o.is_verified = $${idx}`);
      values.push(verified === 'true');
      idx += 1;
    }
    if (active === 'true' || active === 'false') {
      where.push(`o.is_active = $${idx}`);
      values.push(active === 'true');
      idx += 1;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        o.id,
        o.slug,
        o.name,
        o.tagline,
        o.description,
        o.logo_url,
        o.website_url,
        o.instagram_url,
        o.facebook_url,
        o.whatsapp_url,
        o.contact_email,
        o.contact_phone,
        o.city,
        o.country,
        o.is_verified,
        o.is_active,
        COALESCE(o.subscription_status, 'inactive') AS subscription_status,
        COALESCE(o.subscription_plan, 'free') AS subscription_plan,
        o.subscription_expires_at,
        o.created_by_user_id,
        o.created_at,
        o.updated_at,
        COUNT(DISTINCT om.user_id)::int AS member_count,
        COUNT(DISTINCT to2.trail_id)::int AS trail_count
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
      LEFT JOIN trail_organizations to2 ON to2.organization_id = o.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.is_verified DESC, o.created_at DESC
      `,
      values
    );

    return NextResponse.json({ organizations: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as {
      slug?: string;
      name?: string;
      tagline?: string | null;
      description?: string | null;
      logo_url?: string | null;
      website_url?: string | null;
      instagram_url?: string | null;
      facebook_url?: string | null;
      whatsapp_url?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      city?: string | null;
      country?: string | null;
      is_verified?: boolean;
      is_active?: boolean;
      subscription_status?: string;
      subscription_plan?: string;
      subscription_expires_at?: string | null;
    };

    const slug = (body.slug || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const logoUrl = body.logo_url?.trim() || null;

    if (!slug || !name) {
      return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
      return NextResponse.json(
        { error: 'slug must use lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }
    if (logoUrl && !isAllowedImageUrl(logoUrl, 650_000)) {
      return NextResponse.json(
        { error: 'Logo must be a valid HTTPS image URL or supported image upload.' },
        { status: 400 }
      );
    }
    const subscriptionStatus = body.subscription_status || 'inactive';
    const subscriptionPlan = body.subscription_plan || 'free';
    if (!SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status.' }, { status: 400 });
    }
    if (!SUBSCRIPTION_PLANS.has(subscriptionPlan)) {
      return NextResponse.json({ error: 'Invalid subscription plan.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
        INSERT INTO organizations (
          slug, name, tagline, description, logo_url, website_url, instagram_url, facebook_url,
          whatsapp_url, contact_email, contact_phone, city, country, is_verified, is_active,
          subscription_status, subscription_plan, subscription_expires_at,
          created_by_user_id, owner_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        RETURNING *
        `,
        [
          slug,
          name,
          body.tagline?.trim() || null,
          body.description?.trim() || null,
          logoUrl,
          body.website_url?.trim() || null,
          body.instagram_url?.trim() || null,
          body.facebook_url?.trim() || null,
          body.whatsapp_url?.trim() || null,
          body.contact_email?.trim() || null,
          body.contact_phone?.trim() || null,
          body.city?.trim() || null,
          body.country?.trim() || 'Nepal',
          Boolean(body.is_verified),
          body.is_active ?? true,
          subscriptionStatus,
          subscriptionPlan,
          body.subscription_expires_at || null,
          auth.sub,
          null,
        ]
      );
      await client.query('COMMIT');
      return NextResponse.json({ organization: result.rows[0] }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
