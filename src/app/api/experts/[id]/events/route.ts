import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Event } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostId = params.id;

    const query = `
      SELECT
        e.id,
        e.title,
        e.description,
        e.trail_id,
        e.event_date,
        e.organizer_name,
        e.organizer_email,
        e.max_participants,
        e.current_participants,
        e.meeting_point,
        e.difficulty,
        e.required_expertise,
        e.sport_type,
        e.city,
        e.price_npr,
        e.host_user_id,
        e.created_at,
        e.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ep.id,
              'event_id', ep.event_id,
              'participant_name', ep.participant_name,
              'participant_email', ep.participant_email,
              'phone', ep.phone,
              'expertise_level', ep.expertise_level,
              'joined_at', ep.joined_at
            )
          ) FILTER (WHERE ep.id IS NOT NULL),
          '[]'
        ) AS participants
      FROM events e
      LEFT JOIN event_participants ep ON ep.event_id = e.id
      WHERE e.host_user_id = $1
      GROUP BY e.id
      ORDER BY e.event_date ASC
    `;

    const result = await pool.query(query, [hostId]);

    const events = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      trail_id: row.trail_id,
      event_date: row.event_date,
      organizer_name: row.organizer_name,
      organizer_email: row.organizer_email,
      max_participants: row.max_participants,
      current_participants: row.current_participants,
      meeting_point: row.meeting_point,
      difficulty: row.difficulty,
      required_expertise: row.required_expertise,
      sport_type: row.sport_type,
      city: row.city,
      price_npr: row.price_npr ?? 0,
      host_user_id: row.host_user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      participants: Array.isArray(row.participants) ? row.participants : [],
    }));

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert events' },
      { status: 500 }
    );
  }
}

