import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Trail } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeSafetyLabels } from '@/lib/trail-safety';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await pool.query(
      `
        SELECT
          t.*,
          u.name AS submitted_by_name,
          u.email AS submitted_by_email
        FROM trails t
        LEFT JOIN users u ON u.id = t.submitted_by_user_id
        WHERE t.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Trail not found' },
        { status: 404 }
      );
    }

    const trailRow = result.rows[0];

    // Parse route_data if it exists
    if (trailRow.route_data && typeof trailRow.route_data === 'string') {
      try {
        trailRow.route_data = JSON.parse(trailRow.route_data);
      } catch (e) {
        // If parsing fails, keep as is
      }
    }

    const trail: Trail = trailRow;

    return NextResponse.json({ trail }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trail' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json() as Partial<Trail> & { action?: 'hide' | 'unhide' | 'delete' | 'remove_route' };

    const existing = await pool.query('SELECT * FROM trails WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    const trail = existing.rows[0];
    const isAdmin = auth.role === 'admin';
    const isOwnerExpert = auth.role === 'expert' && trail.submitted_by_user_id === auth.sub;

    if (!isAdmin && !isOwnerExpert) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.name && body.name.trim()) {
      const nameCheck = await pool.query(
        'SELECT id FROM trails WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1',
        [body.name.trim(), id]
      );
      if (nameCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Trail name already exists. Please choose another name.' },
          { status: 409 }
        );
      }
    }

    // Handle hide/unhide action using is_hidden column
    if (body.action === 'hide' || body.action === 'unhide') {
      const isHidden = body.action === 'hide';
      const result = await pool.query(
        `UPDATE trails SET is_hidden = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [isHidden, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }

      return NextResponse.json({ trail: result.rows[0], success: true }, { status: 200 });
    }

    if (body.action === 'remove_route') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const result = await pool.query(
        `
        UPDATE trails
        SET route_data = NULL,
            distance_km = NULL,
            elevation_gain_m = NULL,
            estimated_time_hours = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }

      return NextResponse.json({ trail: result.rows[0], success: true }, { status: 200 });
    }

    // Handle delete action
    if (body.action === 'delete') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const result = await pool.query(
        'DELETE FROM trails WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Original update logic for other fields
    const hasSafetyLabelsField = Object.prototype.hasOwnProperty.call(
      body,
      'safety_labels'
    );

    const result = await pool.query(
      `
      UPDATE trails
      SET
        name = $1,
        description = $2,
        difficulty = $3,
        sport_type = $4,
        location = $5,
        latitude = $6,
        longitude = $7,
        distance_km = $8,
        elevation_gain_m = $9,
        estimated_time_hours = $10,
        image_url = $11,
        trail_images = $12,
        safety_labels = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
      `,
      [
        body.name ?? trail.name,
        body.description ?? trail.description,
        body.difficulty ?? trail.difficulty,
        body.sport_type ?? trail.sport_type ?? 'mtb',
        body.location ?? trail.location,
        body.latitude ?? trail.latitude,
        body.longitude ?? trail.longitude,
        body.distance_km ?? trail.distance_km,
        body.elevation_gain_m ?? trail.elevation_gain_m,
        body.estimated_time_hours ?? trail.estimated_time_hours,
        body.image_url ?? trail.image_url,
        body.trail_images ?? trail.trail_images ?? [],
        hasSafetyLabelsField
          ? normalizeSafetyLabels(body.safety_labels)
          : trail.safety_labels ?? [],
        id,
      ]
    );

    return NextResponse.json({ trail: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating trail:', error);
    return NextResponse.json(
      { error: 'Failed to update trail' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Delete is not supported. Use PATCH action=hide or action=delete.' },
    { status: 405 }
  );
}
