import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canOperateOrganization, canUseOrganizationRevenueFeatures } from '@/lib/organization-access';

const VALID_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);
const VALID_PROGRAM_TYPES = new Set(['guided_ride', 'training', 'skills_clinic', 'tour']);
const VALID_WEEKDAYS = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

async function getOrganizationPrograms(organizationId: string) {
  const result = await pool.query(
    `
    SELECT
      p.*,
      u.name AS expert_name,
      u.email AS expert_email,
      t.name AS trail_name,
      t.slug AS trail_slug,
      t.location AS trail_location
    FROM expert_ride_programs p
    JOIN users u ON u.id = p.expert_user_id
    JOIN trails t ON t.id = p.trail_id
    WHERE p.organization_id = $1
    ORDER BY p.is_active DESC, p.created_at DESC
    `,
    [organizationId]
  );
  return result.rows.map((row) => ({
    ...row,
    program_type: row.program_type || 'guided_ride',
    price_npr: row.price_npr === null ? null : Number(row.price_npr),
    max_group_size: Number(row.max_group_size || 1),
    availability_weekdays: Array.isArray(row.availability_weekdays)
      ? row.availability_weekdays
      : [],
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    const { id: organizationId } = await params;
    if (!auth || !(await canOperateOrganization(auth.sub, organizationId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const experts = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.profile_photo_url,
        COALESCE(
          json_agg(et.trail_id) FILTER (WHERE et.trail_id IS NOT NULL),
          '[]'::json
        ) AS trail_ids
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      LEFT JOIN expert_trails et ON et.expert_user_id = u.id
      WHERE om.organization_id = $1
        AND om.status = 'active'
        AND u.role = 'expert'
        AND u.is_verified_expert = TRUE
        AND COALESCE(u.is_hidden, FALSE) = FALSE
      GROUP BY u.id
      ORDER BY u.name ASC
      `,
      [organizationId]
    );

    return NextResponse.json(
      { programs: await getOrganizationPrograms(organizationId), experts: experts.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching organization ride programs:', error);
    return NextResponse.json({ error: 'Failed to fetch organization programs' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    const { id: organizationId } = await params;
    if (!auth || !(await canOperateOrganization(auth.sub, organizationId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canUseOrganizationRevenueFeatures(organizationId))) {
      return NextResponse.json(
        { error: 'A verified organization with an active subscription is required to publish ride programs.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const expertUserId = String(body?.expert_user_id || '').trim();
    const trailId = String(body?.trail_id || '').trim();
    const title = String(body?.title || '').trim();
    const programType = String(body?.program_type || 'guided_ride').trim();
    const skillLevel = String(body?.skill_level || 'intermediate').trim();
    const requestedWeekdays: string[] = Array.isArray(body?.availability_weekdays)
      ? body.availability_weekdays
          .map((day: unknown) => String(day))
          .filter((day: string) => VALID_WEEKDAYS.has(day))
      : [];
    const availabilityWeekdays = Array.from(new Set<string>(requestedWeekdays));
    const priceRaw = body?.price_npr;
    const priceNpr =
      priceRaw === null || priceRaw === undefined || String(priceRaw).trim() === ''
        ? null
        : Number(priceRaw);
    const maxGroupSize = Number(body?.max_group_size || 4);

    if (!expertUserId || !trailId || !title) {
      return NextResponse.json(
        { error: 'Title, expert, and linked trail are required.' },
        { status: 400 }
      );
    }
    if (title.length > 180) {
      return NextResponse.json({ error: 'Title must be 180 characters or fewer.' }, { status: 400 });
    }
    if (!VALID_PROGRAM_TYPES.has(programType) || !VALID_LEVELS.has(skillLevel)) {
      return NextResponse.json({ error: 'Invalid program type or skill level.' }, { status: 400 });
    }
    if (priceNpr !== null && (!Number.isFinite(priceNpr) || priceNpr < 0)) {
      return NextResponse.json({ error: 'Price must be zero or greater.' }, { status: 400 });
    }
    if (!Number.isInteger(maxGroupSize) || maxGroupSize < 1 || maxGroupSize > 50) {
      return NextResponse.json({ error: 'Group size must be between 1 and 50.' }, { status: 400 });
    }

    const eligibility = await pool.query(
      `
      SELECT 1
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      JOIN expert_trails et ON et.expert_user_id = u.id AND et.trail_id = $3
      JOIN trail_organizations trail_org
        ON trail_org.organization_id = om.organization_id
       AND trail_org.trail_id = $3
      JOIN trails t ON t.id = $3
      WHERE om.organization_id = $1
        AND om.user_id = $2
        AND om.status = 'active'
        AND u.role = 'expert'
        AND u.is_verified_expert = TRUE
        AND COALESCE(u.is_hidden, FALSE) = FALSE
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      LIMIT 1
      `,
      [organizationId, expertUserId, trailId]
    );
    if (!eligibility.rows.length) {
      return NextResponse.json(
        { error: 'Choose a verified organization expert and a trail associated with both profiles.' },
        { status: 400 }
      );
    }

    await pool.query(
      `
      INSERT INTO expert_ride_programs (
        expert_user_id,
        trail_id,
        organization_id,
        created_by_user_id,
        title,
        program_type,
        description,
        price_npr,
        max_group_size,
        duration_note,
        meeting_point_note,
        availability_weekdays,
        available_time_note,
        skill_level,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, TRUE)
      `,
      [
        expertUserId,
        trailId,
        organizationId,
        auth.sub,
        title,
        programType,
        String(body?.description || '').trim() || null,
        priceNpr,
        maxGroupSize,
        String(body?.duration_note || '').trim() || null,
        String(body?.meeting_point_note || '').trim() || null,
        availabilityWeekdays.length ? JSON.stringify(availabilityWeekdays) : null,
        String(body?.available_time_note || '').trim() || null,
        skillLevel,
      ]
    );

    return NextResponse.json({ programs: await getOrganizationPrograms(organizationId) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'This expert already has a program with that title for this trail.' }, { status: 409 });
    }
    console.error('Error creating organization ride program:', error);
    return NextResponse.json({ error: 'Failed to create organization program' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    const { id: organizationId } = await params;
    if (!auth || !(await canOperateOrganization(auth.sub, organizationId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const programId = String(body?.id || '').trim();
    if (!programId || typeof body?.is_active !== 'boolean') {
      return NextResponse.json({ error: 'Program id and active state are required.' }, { status: 400 });
    }
    if (body.is_active && !(await canUseOrganizationRevenueFeatures(organizationId))) {
      return NextResponse.json(
        { error: 'A verified organization with an active subscription is required to activate ride programs.' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
      UPDATE expert_ride_programs
      SET is_active = $3, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id
      `,
      [programId, organizationId, body.is_active]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Program not found.' }, { status: 404 });
    }

    return NextResponse.json({ programs: await getOrganizationPrograms(organizationId) }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization ride program:', error);
    return NextResponse.json({ error: 'Failed to update organization program' }, { status: 500 });
  }
}
