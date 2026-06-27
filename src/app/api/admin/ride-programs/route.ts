import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function requireAdmin(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  return auth?.role === 'admin' ? auth : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [programsResult, requestsResult] = await Promise.all([
      pool.query(
        `
        SELECT
          p.id,
          p.expert_user_id,
          p.organization_id,
          p.trail_id,
          p.title,
          p.program_type,
          p.description,
          p.price_npr,
          p.max_group_size,
          p.duration_note,
          p.meeting_point_note,
          p.availability_weekdays,
          p.available_time_note,
          p.skill_level,
          p.is_active,
          p.created_at,
          p.updated_at,
          u.name AS expert_name,
          u.email AS expert_email,
          o.name AS organization_name,
          t.name AS trail_name,
          t.slug AS trail_slug,
          t.location AS trail_location,
          COUNT(r.id)::int AS request_count,
          COUNT(*) FILTER (WHERE r.status = 'pending')::int AS pending_request_count
        FROM expert_ride_programs p
        JOIN users u ON u.id = p.expert_user_id
        LEFT JOIN organizations o ON o.id = p.organization_id
        JOIN trails t ON t.id = p.trail_id
        LEFT JOIN expert_ride_program_requests r ON r.program_id = p.id
        GROUP BY p.id, u.name, u.email, o.name, t.name, t.slug, t.location
        ORDER BY p.created_at DESC
        LIMIT 100
        `
      ),
      pool.query(
        `
        SELECT
          r.id,
          r.program_id,
          r.expert_user_id,
          r.trail_id,
          r.requester_user_id,
          r.requester_name,
          r.requester_email,
          r.requester_phone,
          to_char(r.preferred_date::date, 'YYYY-MM-DD') AS preferred_date,
          r.preferred_time,
          r.group_size,
          r.offered_price_npr,
          r.notes,
          r.expert_response_note,
          r.status,
          r.created_at,
          r.updated_at,
          p.title AS program_title,
          u.name AS expert_name,
          u.email AS expert_email,
          t.name AS trail_name,
          t.slug AS trail_slug,
          t.location AS trail_location
        FROM expert_ride_program_requests r
        JOIN expert_ride_programs p ON p.id = r.program_id
        JOIN users u ON u.id = r.expert_user_id
        JOIN trails t ON t.id = r.trail_id
        ORDER BY
          CASE r.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
          r.created_at DESC
        LIMIT 150
        `
      ),
    ]);

    return NextResponse.json(
      {
        programs: programsResult.rows,
        requests: requestsResult.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching admin ride programs:', error);
    return NextResponse.json({ error: 'Failed to fetch ride programs' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const programId = String(body?.id || '').trim();
    if (!programId) {
      return NextResponse.json({ error: 'Program id is required.' }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE expert_ride_programs
      SET is_active = COALESCE($2::boolean, is_active), updated_at = NOW()
      WHERE id = $1
      RETURNING id, is_active
      `,
      [programId, typeof body?.is_active === 'boolean' ? body.is_active : null]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ride program not found.' }, { status: 404 });
    }

    return NextResponse.json({ program: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating admin ride program:', error);
    return NextResponse.json({ error: 'Failed to update ride program' }, { status: 500 });
  }
}
