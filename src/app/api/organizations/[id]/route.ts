import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization, canOperateOrganization } from '@/lib/organization-access';
import { isAllowedImageUrl } from '@/lib/image-url';

export const dynamic = 'force-dynamic';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LOGO_URL_LENGTH = 650_000;

function buildLookup(idOrSlug: string) {
  if (UUID_V4_REGEX.test(idOrSlug)) {
    return { clause: 'o.id = $1', value: idOrSlug };
  }
  return { clause: 'o.slug = $1', value: idOrSlug.toLowerCase() };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { clause, value } = buildLookup(id);
    const includeDetail = request.nextUrl.searchParams.get('detail') === 'true';

    const result = await pool.query(
      `
      SELECT
        o.*,
        COUNT(DISTINCT om.user_id)::int AS member_count,
        COUNT(DISTINCT to2.trail_id)::int AS trail_count
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
      LEFT JOIN trail_organizations to2 ON to2.organization_id = o.id
      WHERE ${clause}
      GROUP BY o.id
      LIMIT 1
      `,
      [value]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organization = result.rows[0];

    if (!includeDetail) {
      return NextResponse.json({ organization }, { status: 200 });
    }

    if (!organization.is_active) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const [trailsResult, galleryResult, campaignsResult, membersResult, updatesResult, servicesResult] =
      await Promise.all([
        pool.query(
          `
          SELECT
            to2.trail_id,
            t.slug AS trail_slug,
            t.name AS trail_name,
            t.location AS trail_location,
            to2.relation_type,
            to2.is_primary
          FROM trail_organizations to2
          JOIN trails t ON t.id = to2.trail_id
          WHERE to2.organization_id = $1
            AND COALESCE(t.is_hidden, FALSE) = FALSE
          ORDER BY to2.is_primary DESC, to2.created_at DESC
          `,
          [organization.id]
        ),
        pool.query(
          `
          SELECT id, image_url, caption, created_at::text
          FROM organization_gallery_items
          WHERE organization_id = $1
          ORDER BY created_at ASC, id ASC
          `,
          [organization.id]
        ),
        pool.query(
          `
          SELECT
            id,
            trail_id,
            title,
            description,
            target_amount_npr::text,
            raised_amount_npr::text,
            qr_image_url,
            payment_note,
            status
          FROM fundraising_campaigns
          WHERE organization_id = $1
            AND status IN ('active', 'looking_for_funds', 'completed', 'paused')
          ORDER BY created_at DESC
          LIMIT 3
          `,
          [organization.id]
        ),
        pool.query(
          `
          SELECT
            om.id,
            om.role,
            om.status,
            om.created_at::text,
            u.id AS user_id,
            u.name AS user_name,
            u.city AS user_city,
            u.role AS user_role
          FROM organization_members om
          JOIN users u ON u.id = om.user_id
          WHERE om.organization_id = $1
            AND om.status = 'active'
          ORDER BY
            CASE om.role WHEN 'org_owner' THEN 1 WHEN 'org_admin' THEN 2 ELSE 3 END,
            om.created_at DESC
          `,
          [organization.id]
        ),
        pool.query(
          `
          SELECT
            tul.id,
            tul.trail_id,
            t.slug AS trail_slug,
            t.name AS trail_name,
            tul.update_type,
            tul.title,
            tul.details,
            tul.media_urls,
            tul.created_at::text,
            u.name AS actor_name
          FROM trail_update_logs tul
          JOIN trails t ON t.id = tul.trail_id
          LEFT JOIN users u ON u.id = tul.actor_user_id
          WHERE tul.organization_id = $1
            AND COALESCE(t.is_hidden, FALSE) = FALSE
          ORDER BY tul.created_at DESC
          LIMIT 8
          `,
          [organization.id]
        ),
        pool.query(
          `
          SELECT id, category, title, description, price_npr::text, price_note,
                 location, contact_email, contact_phone, website_url, image_url
          FROM organization_services
          WHERE organization_id = $1 AND is_active = TRUE
          ORDER BY created_at DESC
          LIMIT 8
          `,
          [organization.id]
        ),
      ]);

    return NextResponse.json(
      {
        organization,
        trails: trailsResult.rows,
        galleryItems: galleryResult.rows,
        campaigns: campaignsResult.rows,
        members: membersResult.rows,
        updates: updatesResult.rows,
        services: servicesResult.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    const { id } = await params;
    const isPlatformAdmin = auth?.role === 'admin';
    const isOrganizationAdmin = auth
      ? await canAdministerOrganization(auth.sub, id)
      : false;
    if (!auth || (!isPlatformAdmin && !isOrganizationAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clause, value } = buildLookup(id);
    const body = (await request.json()) as Record<string, unknown>;

    const allowedFields = [
      'slug',
      'name',
      'tagline',
      'description',
      'logo_url',
      'website_url',
      'instagram_url',
      'facebook_url',
      'whatsapp_url',
      'contact_email',
      'contact_phone',
      'city',
      'country',
      'is_verified',
      'is_active',
    ] as const;

    const platformOnlyFields = new Set(['slug', 'is_verified', 'is_active']);

    const updates: string[] = [];
    const values: unknown[] = [value];
    let idx = 2;

    for (const field of allowedFields) {
      if (!isPlatformAdmin && platformOnlyFields.has(field)) continue;
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const raw = body[field];
        if (field === 'slug' && typeof raw === 'string') {
          const slug = raw.trim().toLowerCase();
          if (!slug) {
            return NextResponse.json({ error: 'slug cannot be empty' }, { status: 400 });
          }
          updates.push(`${field} = $${idx}`);
          values.push(slug);
        } else if (field === 'name' && typeof raw === 'string') {
          const name = raw.trim();
          if (!name) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
          }
          updates.push(`${field} = $${idx}`);
          values.push(name);
        } else if (field === 'country' && typeof raw === 'string') {
          updates.push(`${field} = $${idx}`);
          values.push(raw.trim() || 'Nepal');
        } else if (
          typeof raw === 'string' &&
          [
            'tagline',
            'description',
            'logo_url',
            'website_url',
            'instagram_url',
            'facebook_url',
            'whatsapp_url',
            'contact_email',
            'contact_phone',
            'city',
          ].includes(field)
        ) {
          if (field === 'logo_url') {
            const logoUrl = raw.trim();
            if (logoUrl && !isAllowedImageUrl(logoUrl, MAX_LOGO_URL_LENGTH)) {
              return NextResponse.json(
                { error: 'Logo must be a valid HTTPS image URL or supported image upload.' },
                { status: 400 }
              );
            }
          }
          updates.push(`${field} = $${idx}`);
          values.push(raw.trim() || null);
        } else {
          updates.push(`${field} = $${idx}`);
          values.push(raw);
        }
        idx += 1;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);

    const result = await pool.query(
      `
      UPDATE organizations o
      SET ${updates.join(', ')}
      WHERE ${clause.replace('o.', '')}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization: result.rows[0] }, { status: 200 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      );
    }
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { clause, value } = buildLookup(id);

    const result = await pool.query(
      `
      DELETE FROM organizations o
      WHERE ${clause}
      RETURNING o.id, o.name
      `,
      [value]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
