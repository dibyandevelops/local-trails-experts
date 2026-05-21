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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `
      SELECT
        tul.id,
        tul.trail_id,
        tul.organization_id,
        tul.actor_user_id,
        tul.update_type,
        tul.title,
        tul.details,
        tul.media_urls,
        tul.created_at,
        o.name AS organization_name,
        o.slug AS organization_slug,
        u.name AS actor_name
      FROM trail_update_logs tul
      LEFT JOIN organizations o ON o.id = tul.organization_id
      LEFT JOIN users u ON u.id = tul.actor_user_id
      WHERE tul.trail_id = $1
      ORDER BY tul.created_at DESC
      `,
      [id]
    );
    return NextResponse.json({ updates: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail updates:', error);
    return NextResponse.json({ error: 'Failed to fetch trail updates' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = (await request.json()) as {
      organization_id?: string | null;
      update_type?: TrailUpdateType;
      title?: string;
      details?: string | null;
      media_urls?: string[] | null;
    };

    if (!isValidUpdateType(body.update_type) || !(body.title || '').trim()) {
      return NextResponse.json(
        { error: 'update_type and title are required' },
        { status: 400 }
      );
    }

    if (body.organization_id) {
      const relation = await pool.query(
        `
        SELECT 1
        FROM trail_organizations
        WHERE trail_id = $1 AND organization_id = $2
        LIMIT 1
        `,
        [id, body.organization_id]
      );
      if (relation.rows.length === 0 && auth.role !== 'admin') {
        return NextResponse.json(
          { error: 'Organization is not linked to this trail' },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      `
      INSERT INTO trail_update_logs (
        trail_id, organization_id, actor_user_id, update_type, title, details, media_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING *
      `,
      [
        id,
        body.organization_id || null,
        auth.sub,
        body.update_type,
        body.title.trim(),
        body.details?.trim() || null,
        JSON.stringify(
          Array.isArray(body.media_urls)
            ? body.media_urls.filter((value) => typeof value === 'string' && value.trim())
            : []
        ),
      ]
    );

    return NextResponse.json({ update: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating trail update:', error);
    return NextResponse.json({ error: 'Failed to create trail update' }, { status: 500 });
  }
}
