import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Trail } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeSafetyLabels } from '@/lib/trail-safety';
import { COMMUNITY_NAME } from '@/lib/branding';
import { getUniqueTrailSlug } from '@/lib/trail-slug';

function normalizeKomootEmbedInput(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  if (value.includes('<iframe')) {
    const match = value.match(/src=["']([^"']+)["']/i);
    return match?.[1]?.trim() || '';
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const communityNameSql = COMMUNITY_NAME.replace(/'/g, "''");
    const { id } = await params;

    const result = await pool.query(
      `
        SELECT
          t.*,
          CASE
            WHEN u.role = 'admin' THEN '${communityNameSql}'
            ELSE u.name
          END AS submitted_by_name,
          u.email AS submitted_by_email,
          COALESCE(associated_experts.expert_count, 0)::int AS associated_expert_count,
          COALESCE(associated_experts.experts, '[]'::json) AS associated_experts
        FROM trails t
        LEFT JOIN users u ON u.id = t.submitted_by_user_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS expert_count,
            json_agg(
              json_build_object(
                'id', expert.id,
                'name', expert.name,
                'email', expert.email,
                'city', expert.city,
                'profile_photo_url', expert.profile_photo_url,
                'is_verified_expert', expert.is_verified_expert,
                'average_rating', COALESCE(er.average_rating, 0),
                'review_count', COALESCE(er.review_count, 0)
              )
              ORDER BY
                expert.is_verified_expert DESC,
                COALESCE(er.average_rating, 0) DESC,
                COALESCE(er.review_count, 0) DESC,
                (expert.profile_photo_url IS NOT NULL) DESC,
                et.sort_order ASC,
                et.created_at DESC
            ) AS experts
          FROM expert_trails et
          JOIN users expert ON expert.id = et.expert_user_id
          LEFT JOIN (
            SELECT
              expert_user_id,
              AVG(rating)::float AS average_rating,
              COUNT(*)::int AS review_count
            FROM expert_reviews
            GROUP BY expert_user_id
          ) er ON er.expert_user_id = expert.id
          WHERE et.trail_id = t.id
            AND expert.role = 'expert'
            AND COALESCE(expert.is_hidden, FALSE) = FALSE
        ) associated_experts ON TRUE
        WHERE t.id::text = $1 OR t.slug = $1
        ORDER BY CASE WHEN t.id::text = $1 THEN 0 ELSE 1 END
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as Partial<Trail> & { action?: 'hide' | 'unhide' | 'delete' | 'remove_route' };

    const existing = await pool.query('SELECT * FROM trails WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    const trail = existing.rows[0];
    const isAdmin = auth.role === 'admin';
    const isExpert = auth.role === 'expert';
    const isOwnerExpert = isExpert && trail.submitted_by_user_id === auth.sub;

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

    const hazardFieldsProvided =
      Object.prototype.hasOwnProperty.call(body, 'is_hazardous') ||
      Object.prototype.hasOwnProperty.call(body, 'hazard_note');

    if (hazardFieldsProvided) {
      if (!(isAdmin || isExpert)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const result = await pool.query(
        `
        UPDATE trails
        SET
          is_hazardous = $1,
          hazard_note = $2,
          hazard_updated_by = $3,
          hazard_updated_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
        `,
        [
          body.is_hazardous ?? trail.is_hazardous ?? false,
          body.hazard_note ?? trail.hazard_note ?? null,
          auth.sub,
          id,
        ]
      );

      return NextResponse.json({ trail: result.rows[0] }, { status: 200 });
    }

    if (!isAdmin && !isOwnerExpert) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const nextName = body.name ?? trail.name;
    const nextSlug =
      body.name && body.name.trim()
        ? await getUniqueTrailSlug(pool, body.name.trim(), id)
        : trail.slug;

    const result = await pool.query(
      `
      UPDATE trails
      SET
        name = $1,
        slug = $2,
        description = $3,
        difficulty = $4,
        sport_type = $5,
        location = $6,
        latitude = $7,
        longitude = $8,
        distance_km = $9,
        elevation_gain_m = $10,
        estimated_time_hours = $11,
        image_url = $12,
        trail_images = $13,
        komoot_embed_url = $14,
        safety_labels = $15,
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
      `,
      [
        nextName,
        nextSlug,
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
        body.komoot_embed_url
          ? normalizeKomootEmbedInput(body.komoot_embed_url)
          : trail.komoot_embed_url ?? null,
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
