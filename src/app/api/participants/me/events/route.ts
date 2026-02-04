import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ events: [] }, { status: 200 });
    }

    const userResult = await pool.query(
      'SELECT email, role, name FROM users WHERE id = $1 LIMIT 1',
      [auth.sub]
    );
    const user = userResult.rows[0];

    if (!user || user.role !== 'participant') {
      return NextResponse.json({ events: [] }, { status: 200 });
    }

    const eventsResult = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.event_date,
        e.city,
        e.sport_type,
        ep.participant_name,
        ep.participant_email,
        ep.joined_at
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      WHERE ep.participant_email = $1
      ORDER BY ep.joined_at DESC
    `,
      [user.email]
    );

    return NextResponse.json({ events: eventsResult.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching participant events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participant events' },
      { status: 500 }
    );
  }
}
