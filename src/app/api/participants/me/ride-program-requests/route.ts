import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
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
        p.max_group_size,
        p.price_npr,
        p.duration_note,
        p.meeting_point_note,
        p.availability_weekdays AS program_availability_weekdays,
        p.available_time_note,
        t.name AS trail_name,
        t.slug AS trail_slug,
        t.location AS trail_location,
        u.name AS expert_name,
        u.email AS expert_email,
        u.availability_weekdays AS expert_availability_weekdays
      FROM expert_ride_program_requests r
      JOIN expert_ride_programs p ON p.id = r.program_id
      JOIN trails t ON t.id = r.trail_id
      JOIN users u ON u.id = r.expert_user_id
      WHERE r.requester_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 100
      `,
      [auth.sub]
    );

    return NextResponse.json({ requests: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching participant ride program requests:', error);
    return NextResponse.json({ error: 'Failed to fetch ride program requests' }, { status: 500 });
  }
}
