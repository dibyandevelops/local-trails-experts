import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

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
