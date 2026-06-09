import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/image-url';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CAPTION_LENGTH = 160;

function buildLookup(idOrSlug: string) {
  if (UUID_V4_REGEX.test(idOrSlug)) {
    return { clause: 'o.id = $1', value: idOrSlug };
  }
  return { clause: 'o.slug = $1', value: idOrSlug.toLowerCase() };
}

async function resolveOrganizationId(idOrSlug: string) {
  const { clause, value } = buildLookup(idOrSlug);
  const result = await pool.query(
    `SELECT o.id FROM organizations o WHERE ${clause} LIMIT 1`,
    [value]
  );
  return result.rows[0]?.id as string | undefined;
}

async function canManage(userId: string, organizationId: string) {
  const membership = await pool.query(
    `
    SELECT 1
    FROM organization_members
    WHERE organization_id = $1
      AND user_id = $2
      AND status = 'active'
      AND role IN ('org_admin', 'org_editor')
    LIMIT 1
    `,
    [organizationId, userId]
  );
  return membership.rows.length > 0;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const organizationId = await resolveOrganizationId(id);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const allowed = auth.role === 'admin' || (await canManage(auth.sub, organizationId));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await pool.query(
      `
      DELETE FROM organization_gallery_items
      WHERE id = $1 AND organization_id = $2
      RETURNING id
      `,
      [itemId, organizationId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting organization gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization gallery item' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const organizationId = await resolveOrganizationId(id);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const allowed = auth.role === 'admin' || (await canManage(auth.sub, organizationId));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      image_url?: string;
      caption?: string | null;
    };
    const imageUrl =
      typeof body.image_url === 'string' ? body.image_url.trim() : null;
    const caption = typeof body.caption === 'string' ? body.caption.trim() : body.caption;

    if (imageUrl && !isAllowedImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'image_url must be a valid HTTPS image URL or supported image upload' },
        { status: 400 }
      );
    }
    if (typeof caption === 'string' && caption.length > MAX_CAPTION_LENGTH) {
      return NextResponse.json({ error: 'caption is too long' }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE organization_gallery_items
      SET
        image_url = COALESCE(NULLIF(TRIM($1), ''), image_url),
        caption = CASE
          WHEN $2::text IS NULL THEN caption
          ELSE NULLIF(TRIM($2), '')
        END
      WHERE id = $3 AND organization_id = $4
      RETURNING id, organization_id, image_url, caption, created_at
      `,
      [
        imageUrl,
        caption ?? null,
        itemId,
        organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to update organization gallery item' },
      { status: 500 }
    );
  }
}
