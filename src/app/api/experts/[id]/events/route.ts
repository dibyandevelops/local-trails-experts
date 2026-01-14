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
        id,
        title,
        description,
        trail_id,
        event_date,
        organizer_name,
        organizer_email,
        max_participants,
        current_participants,
        meeting_point,
        difficulty,
        required_expertise,
        sport_type,
        city,
        price_npr,
        host_user_id,
        created_at,
        updated_at
      FROM events
      WHERE host_user_id = $1
      ORDER BY event_date ASC
    `;

    const result = await pool.query(query, [hostId]);

    const events: Event[] = result.rows.map((row: any) => ({
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


