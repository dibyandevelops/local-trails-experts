import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import type { ExpertRideProgram, ExpertiseLevel } from '@/types';

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

function normalizeProgramRow(row: any): ExpertRideProgram {
  return {
    ...row,
    price_npr: row.price_npr === null ? null : Number(row.price_npr),
    max_group_size: Number(row.max_group_size || 1),
  };
}

async function getPrograms(expertUserId: string) {
  const result = await pool.query(
    `
    SELECT
      p.*,
      t.name AS trail_name,
      t.slug AS trail_slug,
      t.location AS trail_location,
      t.sport_type AS trail_sport_type,
      t.difficulty AS trail_difficulty,
      t.image_url AS trail_image_url
    FROM expert_ride_programs p
    JOIN trails t ON t.id = p.trail_id
    WHERE p.expert_user_id = $1
    ORDER BY p.is_active DESC, p.created_at DESC
    `,
    [expertUserId]
  );
  return result.rows.map(normalizeProgramRow);
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ programs: await getPrograms(auth.sub) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert ride programs:', error);
    return NextResponse.json({ error: 'Failed to fetch ride programs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const expertResult = await pool.query(
      'SELECT is_verified_expert FROM users WHERE id = $1 AND role = $2 LIMIT 1',
      [auth.sub, 'expert']
    );
    if (!expertResult.rows[0]?.is_verified_expert) {
      return NextResponse.json({ error: 'Only verified experts can create ride programs.' }, { status: 403 });
    }

    const body = await request.json();
    const trailId = String(body?.trail_id || '').trim();
    const description = String(body?.description || '').trim();
    const durationNote = String(body?.duration_note || '').trim();
    const meetingPointNote = String(body?.meeting_point_note || '').trim();
    const skillLevel = String(body?.skill_level || 'intermediate').trim() as ExpertiseLevel;
    const priceRaw = body?.price_npr;
    const groupSize = Math.max(1, Math.min(50, Number(body?.max_group_size || 4)));
    const isActive = body?.is_active !== false;

    if (!trailId) {
      return NextResponse.json({ error: 'Please select an associated trail.' }, { status: 400 });
    }
    if (!VALID_LEVELS.has(skillLevel)) {
      return NextResponse.json({ error: 'Invalid skill level.' }, { status: 400 });
    }

    const trailResult = await pool.query(
      `
      SELECT t.id, t.name
      FROM expert_trails et
      JOIN trails t ON t.id = et.trail_id
      WHERE et.expert_user_id = $1
        AND et.trail_id = $2
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      LIMIT 1
      `,
      [auth.sub, trailId]
    );
    const trail = trailResult.rows[0];
    if (!trail) {
      return NextResponse.json(
        { error: 'Selected trail must be associated with your expert profile first.' },
        { status: 400 }
      );
    }

    const userResult = await pool.query('SELECT name FROM users WHERE id = $1 LIMIT 1', [auth.sub]);
    const expertName = userResult.rows[0]?.name || 'Expert';
    const title = `Ride with ${expertName} to ${trail.name}`;
    const priceNpr =
      priceRaw === null || priceRaw === undefined || String(priceRaw).trim() === ''
        ? null
        : Number(priceRaw);
    if (priceNpr !== null && (!Number.isFinite(priceNpr) || priceNpr < 0)) {
      return NextResponse.json({ error: 'Price must be zero or greater.' }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO expert_ride_programs (
        expert_user_id,
        trail_id,
        title,
        description,
        price_npr,
        max_group_size,
        duration_note,
        meeting_point_note,
        skill_level,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (expert_user_id, trail_id, title)
      DO UPDATE SET
        description = EXCLUDED.description,
        price_npr = EXCLUDED.price_npr,
        max_group_size = EXCLUDED.max_group_size,
        duration_note = EXCLUDED.duration_note,
        meeting_point_note = EXCLUDED.meeting_point_note,
        skill_level = EXCLUDED.skill_level,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      `,
      [
        auth.sub,
        trailId,
        title,
        description || null,
        priceNpr,
        groupSize,
        durationNote || null,
        meetingPointNote || null,
        skillLevel,
        isActive,
      ]
    );

    return NextResponse.json({ programs: await getPrograms(auth.sub) }, { status: 200 });
  } catch (error) {
    console.error('Error saving expert ride program:', error);
    return NextResponse.json({ error: 'Failed to save ride program' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const programId = String(body?.id || '').trim();
    if (!programId) {
      return NextResponse.json({ error: 'Program id is required.' }, { status: 400 });
    }

    await pool.query(
      `
      UPDATE expert_ride_programs
      SET is_active = COALESCE($3::boolean, is_active), updated_at = NOW()
      WHERE id = $1 AND expert_user_id = $2
      `,
      [programId, auth.sub, typeof body?.is_active === 'boolean' ? body.is_active : null]
    );

    return NextResponse.json({ programs: await getPrograms(auth.sub) }, { status: 200 });
  } catch (error) {
    console.error('Error updating expert ride program:', error);
    return NextResponse.json({ error: 'Failed to update ride program' }, { status: 500 });
  }
}
