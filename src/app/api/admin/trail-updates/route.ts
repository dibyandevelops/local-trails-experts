import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type TrailUpdateType =
  | 'condition_update'
  | 'maintenance_done'
  | 'hazard_reported'
  | 'hazard_cleared'
  | 'route_changed'
  | 'metadata_updated';

function isValidUpdateType(value: unknown): value is TrailUpdateType {
  return (
    value === 'condition_update' ||
    value === 'maintenance_done' ||
    value === 'hazard_reported' ||
    value === 'hazard_cleared' ||
    value === 'route_changed' ||
    value === 'metadata_updated'
  );
}

async function canManageOrganization(userId: string, organizationId: string | null) {
  if (!organizationId) return false;
  const result = await pool.query(
    `
    SELECT 1
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.organization_id = $1
      AND om.user_id = $2
      AND om.status = 'active'
      AND om.role IN ('org_admin', 'org_editor')
      AND o.is_active = TRUE
    LIMIT 1
    `,
    [organizationId, userId]
  );
  return result.rows.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trailId = (request.nextUrl.searchParams.get('trail_id') || '').trim();
    const organizationId = (request.nextUrl.searchParams.get('organization_id') || '').trim();
    const where: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (trailId) {
      where.push(`tul.trail_id = $${idx}`);
      values.push(trailId);
      idx += 1;
    }
    if (organizationId) {
      where.push(`tul.organization_id = $${idx}`);
      values.push(organizationId);
      idx += 1;
    }
    if (auth.role !== 'admin') {
      where.push(`EXISTS (
        SELECT 1
        FROM organization_members om
        WHERE om.organization_id = tul.organization_id
          AND om.user_id = $${idx}
          AND om.status = 'active'
          AND om.role IN ('org_admin', 'org_editor')
      )`);
      values.push(auth.sub);
      idx += 1;
    }
    where.push('(tul.organization_id IS NULL OR o.is_active = TRUE)');

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await pool.query(
      `
      SELECT
        tul.id,
        tul.trail_id,
        t.name AS trail_name,
        tul.organization_id,
        o.name AS organization_name,
        tul.actor_user_id,
        u.name AS actor_name,
        tul.update_type,
        tul.title,
        tul.details,
        tul.media_urls,
        tul.created_at::text
      FROM trail_update_logs tul
      LEFT JOIN trails t ON t.id = tul.trail_id
      LEFT JOIN organizations o ON o.id = tul.organization_id
      LEFT JOIN users u ON u.id = tul.actor_user_id
      ${whereClause}
      ORDER BY tul.created_at DESC
      `,
      values
    );

    return NextResponse.json({ updates: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin trail updates:', error);
    return NextResponse.json({ error: 'Failed to fetch trail updates' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      trail_id?: string;
      organization_id?: string | null;
      update_type?: TrailUpdateType;
      title?: string;
      details?: string | null;
      media_urls?: string[] | null;
    };

    const id = (body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await pool.query(
      `
      SELECT id, trail_id, organization_id
      FROM trail_update_logs
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    if (!existing.rows.length) {
      return NextResponse.json({ error: 'Trail update not found' }, { status: 404 });
    }

    const current = existing.rows[0] as {
      id: string;
      trail_id: string;
      organization_id: string | null;
    };

    if (auth.role !== 'admin') {
      const allowed = await canManageOrganization(auth.sub, current.organization_id);
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (
        (body.trail_id && body.trail_id !== current.trail_id) ||
        (Object.prototype.hasOwnProperty.call(body, 'organization_id') &&
          (body.organization_id || null) !== current.organization_id)
      ) {
        return NextResponse.json(
          { error: 'Trail builder members cannot move trail updates' },
          { status: 403 }
        );
      }
    }

    const nextTrailId = body.trail_id?.trim() || current.trail_id;
    const nextOrganizationId = Object.prototype.hasOwnProperty.call(body, 'organization_id')
      ? (body.organization_id?.trim() || null)
      : current.organization_id;

    if (body.trail_id) {
      const trail = await pool.query('SELECT 1 FROM trails WHERE id = $1 LIMIT 1', [nextTrailId]);
      if (!trail.rows.length) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }
    }

    if (nextOrganizationId) {
      const organization = await pool.query(
        'SELECT 1 FROM organizations WHERE id = $1 AND is_active = TRUE LIMIT 1',
        [nextOrganizationId]
      );
      if (!organization.rows.length) {
        return NextResponse.json(
          { error: 'organization_id must be an active trail builder' },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    if (Object.prototype.hasOwnProperty.call(body, 'trail_id')) {
      updates.push(`trail_id = $${idx}`);
      values.push(nextTrailId);
      idx += 1;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'organization_id')) {
      updates.push(`organization_id = $${idx}`);
      values.push(nextOrganizationId);
      idx += 1;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'update_type')) {
      if (!isValidUpdateType(body.update_type)) {
        return NextResponse.json({ error: 'Invalid update_type' }, { status: 400 });
      }
      updates.push(`update_type = $${idx}`);
      values.push(body.update_type);
      idx += 1;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = (body.title || '').trim();
      if (!title) {
        return NextResponse.json({ error: 'title is required' }, { status: 400 });
      }
      updates.push(`title = $${idx}`);
      values.push(title);
      idx += 1;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'details')) {
      updates.push(`details = $${idx}`);
      values.push(body.details?.trim() || null);
      idx += 1;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'media_urls')) {
      updates.push(`media_urls = $${idx}::jsonb`);
      values.push(
        JSON.stringify(
          Array.isArray(body.media_urls)
            ? body.media_urls.filter((value) => typeof value === 'string' && value.trim())
            : []
        )
      );
      idx += 1;
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE trail_update_logs
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
      `,
      values
    );

    return NextResponse.json({ update: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating admin trail update:', error);
    return NextResponse.json({ error: 'Failed to update trail update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };
    const id = (body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `
      DELETE FROM trail_update_logs
      WHERE id = $1
      RETURNING id, title
      `,
      [id]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Trail update not found' }, { status: 404 });
    }

    return NextResponse.json({ update: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error deleting admin trail update:', error);
    return NextResponse.json({ error: 'Failed to delete trail update' }, { status: 500 });
  }
}
