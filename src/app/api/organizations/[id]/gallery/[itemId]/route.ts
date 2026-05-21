import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
