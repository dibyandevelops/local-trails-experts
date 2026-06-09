import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Event, CreateEventInput } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/image-url';

const MAX_EVENT_TITLE_LENGTH = 160;
const MAX_EVENT_DESCRIPTION_LENGTH = 5000;
const MAX_EVENT_ALERT_LENGTH = 500;
const MAX_EVENT_TEXT_LENGTH = 240;
const MAX_QR_IMAGE_LENGTH = 500_000;

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
    const hasField = (field: keyof CreateEventInput) =>
      Object.prototype.hasOwnProperty.call(body, field);
    const getText = (field: keyof CreateEventInput) =>
      typeof body[field] === 'string' ? String(body[field]).trim() : body[field];

    if (
      (hasField('title') && String(body.title || '').trim().length > MAX_EVENT_TITLE_LENGTH) ||
      (hasField('description') && String(body.description || '').length > MAX_EVENT_DESCRIPTION_LENGTH) ||
      (hasField('trail_alert') && String(body.trail_alert || '').length > MAX_EVENT_ALERT_LENGTH) ||
      (hasField('organizer_name') && String(body.organizer_name || '').length > MAX_EVENT_TEXT_LENGTH) ||
      (hasField('meeting_point') && String(body.meeting_point || '').length > MAX_EVENT_TEXT_LENGTH) ||
      (hasField('city') && String(body.city || '').length > MAX_EVENT_TEXT_LENGTH)
    ) {
      return NextResponse.json({ error: 'Event details are too long.' }, { status: 400 });
    }
    if (
      hasField('organizer_email') &&
      body.organizer_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.organizer_email).trim())
    ) {
      return NextResponse.json({ error: 'Invalid organizer email.' }, { status: 400 });
    }
    if (
      hasField('max_participants') &&
      (!Number.isInteger(Number(body.max_participants)) ||
        Number(body.max_participants) < 1 ||
        Number(body.max_participants) > 500)
    ) {
      return NextResponse.json(
        { error: 'max_participants must be between 1 and 500.' },
        { status: 400 }
      );
    }
    if (
      hasField('price_npr') &&
      (!Number.isFinite(Number(body.price_npr)) ||
        Number(body.price_npr) < 0 ||
        Number(body.price_npr) > 1_000_000)
    ) {
      return NextResponse.json({ error: 'Invalid event price.' }, { status: 400 });
    }
    if (
      hasField('qr_image_url') &&
      body.qr_image_url &&
      !isAllowedImageUrl(String(body.qr_image_url), MAX_QR_IMAGE_LENGTH)
    ) {
      return NextResponse.json(
        { error: 'QR image must be a valid HTTPS image URL or supported image upload.' },
        { status: 400 }
      );
    }

    if (hasField('title')) addUpdate('title', getText('title') || null);
    if (hasField('description')) addUpdate('description', getText('description') ?? null);
    if (hasField('trail_alert')) addUpdate('trail_alert', getText('trail_alert') ?? null);
    if (hasField('trail_id')) addUpdate('trail_id', body.trail_id ?? null);
    if (hasField('event_date')) addUpdate('event_date', body.event_date || null);
    if (hasField('organizer_name')) addUpdate('organizer_name', getText('organizer_name') ?? null);
    if (hasField('organizer_email')) addUpdate('organizer_email', getText('organizer_email') ?? null);
    if (hasField('meeting_point')) addUpdate('meeting_point', getText('meeting_point') ?? null);
    if (hasField('difficulty')) addUpdate('difficulty', getText('difficulty') ?? null);
    if (hasField('required_expertise')) addUpdate('required_expertise', getText('required_expertise') ?? null);
    if (hasField('sport_type')) addUpdate('sport_type', getText('sport_type') ?? null);
    if (hasField('city')) addUpdate('city', getText('city') ?? null);
    if (hasField('price_npr')) addUpdate('price_npr', body.price_npr ?? null);
    if (hasField('max_participants')) addUpdate('max_participants', body.max_participants ?? null);
    if (hasField('qr_image_url')) addUpdate('qr_image_url', getText('qr_image_url') ?? null);

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
