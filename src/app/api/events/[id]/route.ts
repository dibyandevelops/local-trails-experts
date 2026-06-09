import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Event, CreateEventInput } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const result = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.trail_alert,
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
        e.qr_image_url,
        e.host_user_id,
        e.created_at,
        e.updated_at,
        t.id as trail_table_id,
        t.name as trail_name,
        t.description as trail_description,
        t.difficulty as trail_difficulty,
        t.sport_type as trail_sport_type,
        t.location as trail_location,
        t.latitude as trail_latitude,
        t.longitude as trail_longitude,
        t.distance_km as trail_distance_km,
        t.elevation_gain_m as trail_elevation_gain_m,
        t.estimated_time_hours as trail_estimated_time_hours,
        t.image_url as trail_image_url
      FROM events e
      LEFT JOIN trails t ON e.trail_id = t.id
      WHERE e.id = $1
      LIMIT 1
    `,
      [eventId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const event: Event = {
      id: row.id,
      title: row.title,
      description: row.description,
      trail_alert: row.trail_alert,
      trail_id: row.trail_id,
      trail:
        row.trail_id && row.trail_table_id
          ? {
              id: row.trail_table_id,
              name: row.trail_name,
              description: row.trail_description,
              difficulty: row.trail_difficulty,
              sport_type: row.trail_sport_type,
              location: row.trail_location,
              latitude: row.trail_latitude,
              longitude: row.trail_longitude,
              distance_km: row.trail_distance_km,
              elevation_gain_m: row.trail_elevation_gain_m,
              estimated_time_hours: row.trail_estimated_time_hours,
              image_url: row.trail_image_url,
              created_at: '',
              updated_at: '',
              route_data: row.route_data,
            }
          : undefined,
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
      qr_image_url: row.qr_image_url ?? null,
      host_user_id: row.host_user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
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
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const body = (await request.json()) as Partial<CreateEventInput>;

    const existing = await pool.query(
      'SELECT id, host_user_id FROM events WHERE id = $1 LIMIT 1',
      [eventId]
    );
    const eventRow = existing.rows[0];

    if (!eventRow) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (auth.role === 'expert' && eventRow.host_user_id !== auth.sub) {
      return NextResponse.json(
        { error: 'Experts can only edit their own events.' },
        { status: 403 }
      );
    }

    const updateParams: unknown[] = [];
    const updates: string[] = [];
    const addUpdate = (column: string, value: unknown) => {
      updateParams.push(value);
      updates.push(`${column} = $${updateParams.length}`);
    };

    if (Object.prototype.hasOwnProperty.call(body, 'title')) addUpdate('title', body.title || null);
    if (Object.prototype.hasOwnProperty.call(body, 'description')) addUpdate('description', body.description ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'trail_alert')) addUpdate('trail_alert', body.trail_alert ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'trail_id')) addUpdate('trail_id', body.trail_id ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'event_date')) addUpdate('event_date', body.event_date || null);
    if (Object.prototype.hasOwnProperty.call(body, 'organizer_name')) addUpdate('organizer_name', body.organizer_name ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'organizer_email')) addUpdate('organizer_email', body.organizer_email ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'meeting_point')) addUpdate('meeting_point', body.meeting_point ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'difficulty')) addUpdate('difficulty', body.difficulty ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'required_expertise')) addUpdate('required_expertise', body.required_expertise ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'sport_type')) addUpdate('sport_type', body.sport_type ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'city')) addUpdate('city', body.city ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'price_npr')) addUpdate('price_npr', body.price_npr ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'max_participants')) addUpdate('max_participants', body.max_participants ?? null);
    if (Object.prototype.hasOwnProperty.call(body, 'qr_image_url')) addUpdate('qr_image_url', body.qr_image_url ?? null);

    if (updates.length === 0) {
      return NextResponse.json({ event: eventRow }, { status: 200 });
    }

    updateParams.push(eventId);
    const result = await pool.query(
      `
      UPDATE events
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${updateParams.length}
      RETURNING *
      `,
      updateParams
    );

    return NextResponse.json({ event: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}
