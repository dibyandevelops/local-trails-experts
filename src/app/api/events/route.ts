import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Event, CreateEventInput } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const expertise = searchParams.get('expertise');
    const upcoming = searchParams.get('upcoming') === 'true';

    let query = `
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
        e.created_at,
        e.updated_at,
        t.id as trail_table_id,
        t.name as trail_name,
        t.description as trail_description,
        t.difficulty as trail_difficulty,
        t.location as trail_location,
        t.latitude as trail_latitude,
        t.longitude as trail_longitude,
        t.distance_km as trail_distance_km,
        t.elevation_gain_m as trail_elevation_gain_m,
        t.estimated_time_hours as trail_estimated_time_hours,
        t.image_url as trail_image_url
      FROM events e
      LEFT JOIN trails t ON e.trail_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (expertise) {
      query += ` AND e.required_expertise = $${paramIndex}`;
      params.push(expertise);
      paramIndex++;
    }

    if (upcoming) {
      query += ` AND e.event_date >= NOW()`;
    }

    query += ' ORDER BY e.event_date ASC';

    const result = await pool.query(query, params);

    const events: Event[] = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      trail_id: row.trail_id,
      trail: row.trail_id && row.trail_table_id ? {
        id: row.trail_table_id,
        name: row.trail_name,
        description: row.trail_description,
        difficulty: row.trail_difficulty,
        location: row.trail_location,
        latitude: row.trail_latitude,
        longitude: row.trail_longitude,
        distance_km: row.trail_distance_km,
        elevation_gain_m: row.trail_elevation_gain_m,
        estimated_time_hours: row.trail_estimated_time_hours,
        image_url: row.trail_image_url,
        created_at: '',
        updated_at: '',
      } : undefined,
      event_date: row.event_date,
      organizer_name: row.organizer_name,
      organizer_email: row.organizer_email,
      max_participants: row.max_participants,
      current_participants: row.current_participants,
      meeting_point: row.meeting_point,
      difficulty: row.difficulty,
      required_expertise: row.required_expertise,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEventInput = await request.json();

    const {
      title,
      description,
      trail_id,
      event_date,
      organizer_name,
      organizer_email,
      max_participants = 20,
      meeting_point,
      difficulty,
      required_expertise,
    } = body;

    if (!title || !event_date || !required_expertise) {
      return NextResponse.json(
        { error: 'Missing required fields: title, event_date, required_expertise' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO events (
        title, description, trail_id, event_date, organizer_name,
        organizer_email, max_participants, meeting_point, difficulty, required_expertise
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      title,
      description || null,
      trail_id || null,
      event_date,
      organizer_name || null,
      organizer_email || null,
      max_participants,
      meeting_point || null,
      difficulty || null,
      required_expertise,
    ]);

    const event: Event = result.rows[0];

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

