import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [trailRequestsRes, eventJoinsRes] = await Promise.all([
      pool.query(
        `
        SELECT
          tir.id,
          tir.trail_id,
          tir.requester_user_id,
          tir.requester_name,
          tir.requester_email,
          tir.description,
          to_char(tir.preferred_date::date, 'YYYY-MM-DD') AS preferred_date,
          tir.created_at,
          t.name AS trail_name,
          t.sport_type AS trail_sport_type,
          t.location AS trail_location
        FROM trail_interest_requests tir
        JOIN trails t ON t.id = tir.trail_id
        WHERE tir.assigned_expert_user_id = $1
        ORDER BY tir.created_at DESC
        LIMIT 50
        `,
        [auth.sub]
      ),
      pool.query(
        `
        SELECT
          ep.id,
          ep.event_id,
          ep.participant_name,
          ep.participant_email,
          ep.joined_at,
          e.title,
          e.event_date
        FROM event_participants ep
        JOIN events e ON e.id = ep.event_id
        WHERE e.host_user_id = $1
        ORDER BY ep.joined_at DESC
        LIMIT 50
        `,
        [auth.sub]
      ),
    ]);

    return NextResponse.json(
      {
        requests: trailRequestsRes.rows,
        eventJoins: eventJoinsRes.rows,
        unreadCount: trailRequestsRes.rows.length + eventJoinsRes.rows.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expert alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert alerts' },
      { status: 500 }
    );
  }
}
