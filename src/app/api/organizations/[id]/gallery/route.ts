import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/image-url';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CAPTION_LENGTH = 160;
const MAX_BATCH_SIZE = 3;
const MAX_GALLERY_ITEMS = 10;

function buildLookup(idOrSlug: string) {
  if (UUID_V4_REGEX.test(idOrSlug)) {
    return { clause: 'o.id = $1', value: idOrSlug };
  }
  return { clause: 'o.slug = $1', value: idOrSlug.toLowerCase() };
}

async function resolveOrganization(idOrSlug: string) {
  const { clause, value } = buildLookup(idOrSlug);
  const result = await pool.query(
    `SELECT o.id, o.is_active FROM organizations o WHERE ${clause} LIMIT 1`,
    [value]
  );
  return result.rows[0] as { id: string; is_active: boolean } | undefined;
}

async function canManageOrganizationGallery(userId: string, organizationId: string) {
  const membership = await pool.query(
    `
    SELECT 1
    FROM organization_members
    WHERE organization_id = $1
      AND user_id = $2
      AND status = 'active'
      AND role IN ('org_owner', 'org_admin', 'org_editor')
    LIMIT 1
    `,
    [organizationId, userId]
  );
  return membership.rows.length > 0;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const organization = await resolveOrganization(id);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const result = await pool.query(
      `
      SELECT id, organization_id, image_url, caption, created_at
      FROM organization_gallery_items
      WHERE organization_id = $1
      ORDER BY created_at ASC, id ASC
      `,
      [organization.id]
    );
    return NextResponse.json({ items: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization gallery:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization gallery' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const organization = await resolveOrganization(id);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (!organization.is_active) {
      return NextResponse.json(
        { error: 'Trail builder must be visible before adding gallery items' },
        { status: 400 }
      );
    }

    const allowed =
      auth.role === 'admin' ||
      (await canManageOrganizationGallery(auth.sub, organization.id));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      image_url?: string;
      caption?: string | null;
      items?: Array<{ image_url?: string; caption?: string | null }>;
    };
    const requestedItems = Array.isArray(body.items)
      ? body.items
      : [{ image_url: body.image_url, caption: body.caption }];
    if (requestedItems.length < 1 || requestedItems.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Upload between 1 and ${MAX_BATCH_SIZE} gallery images at a time.` },
        { status: 400 }
      );
    }
    const items = requestedItems.map((item) => ({
      imageUrl: String(item.image_url || '').trim(),
      caption: String(item.caption || '').trim() || null,
    }));
    for (const item of items) {
      if (!item.imageUrl || !isAllowedImageUrl(item.imageUrl)) {
        return NextResponse.json(
          { error: 'Each image must be a valid HTTPS image URL or supported image upload.' },
          { status: 400 }
        );
      }
      if (item.caption && item.caption.length > MAX_CAPTION_LENGTH) {
        return NextResponse.json({ error: 'A gallery caption is too long.' }, { status: 400 });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM organizations WHERE id = $1 FOR UPDATE', [organization.id]);
      const countResult = await client.query(
        'SELECT COUNT(*)::int AS count FROM organization_gallery_items WHERE organization_id = $1',
        [organization.id]
      );
      const currentCount = Number(countResult.rows[0]?.count || 0);
      if (currentCount + items.length > MAX_GALLERY_ITEMS) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Organizations can keep at most ${MAX_GALLERY_ITEMS} gallery images.` },
          { status: 400 }
        );
      }
      const inserted = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const result = await client.query(
          `
          INSERT INTO organization_gallery_items (
            organization_id, image_url, caption, sort_order, created_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, organization_id, image_url, caption, created_at
          `,
          [organization.id, item.imageUrl, item.caption, currentCount + index, auth.sub]
        );
        inserted.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return NextResponse.json(
        { items: inserted, item: inserted[0], total: currentCount + inserted.length },
        { status: 201 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding organization gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to add organization gallery item' },
      { status: 500 }
    );
  }
}
