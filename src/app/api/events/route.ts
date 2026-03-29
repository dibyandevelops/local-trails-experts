import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Event, CreateEventInput, SportType } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { COMMUNITY_NAME } from '@/lib/branding';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const expertise = searchParams.get('expertise');
    const city = searchParams.get('city');
    const sport = searchParams.get('sport') as SportType | null;
    const expert = searchParams.get('expert');
    const upcoming = searchParams.get('upcoming') === 'true';
    const community = searchParams.get('community') === 'true';
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
    const communityNameLike = `%${COMMUNITY_NAME.toLowerCase()}%`;

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
        e.sport_type,
        e.city,
        e.price_npr,
        e.qr_image_url,
        e.host_user_id,
        u.phone as expert_phone,
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
      LEFT JOIN users u ON e.host_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (expertise) {
      query += ` AND e.required_expertise = $${paramIndex}`;
      params.push(expertise);
      paramIndex++;
    }

    if (city) {
      query += ` AND e.city = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }

    if (sport) {
      query += ` AND e.sport_type = $${paramIndex}`;
      params.push(sport);
      paramIndex++;
    }

    if (expert) {
      query += ` AND e.host_user_id = $${paramIndex}`;
      params.push(expert);
      paramIndex++;
    }

    if (upcoming) {
      query += ` AND e.event_date >= NOW()`;
    }

    if (community) {
      const communityClauses = [
        `LOWER(COALESCE(e.organizer_name, '')) LIKE $${paramIndex}`,
        `LOWER(COALESCE(u.role, '')) = 'admin'`,
      ];
      params.push(communityNameLike);
      paramIndex += 1;

      if (adminEmail) {
        communityClauses.push(`LOWER(COALESCE(e.organizer_email, '')) = $${paramIndex}`);
        params.push(adminEmail);
        paramIndex += 1;
      }

      query += ` AND (${communityClauses.join(' OR ')})`;
    }

    query += ' ORDER BY e.event_date ASC';

    const result = await pool.query(query, params);

    const events: Event[] = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      trail_id: row.trail_id,
      trail:
        row.trail_id && row.trail_table_id
          ? {
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
      organizer_phone: row.expert_phone ?? null,
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
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'expert')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      sport_type,
      city,
      price_npr = 0,
      qr_image_url,
      host_user_id,
      trail_request_id,
    } = body;

    if (auth.role === 'expert') {
      const verifiedResult = await pool.query(
        'SELECT is_verified_expert FROM users WHERE id = $1 LIMIT 1',
        [auth.sub]
      );
      if (!verifiedResult.rows[0]?.is_verified_expert) {
        return NextResponse.json(
          { error: 'Expert verification is pending. Events cannot be created yet.' },
          { status: 403 }
        );
      }
      // Experts can only create events for themselves
      if (host_user_id && host_user_id !== auth.sub) {
        return NextResponse.json(
          { error: 'Experts can only create events for themselves.' },
          { status: 403 }
        );
      }
    }
    if (auth.role === 'admin' && host_user_id) {
      const hostResult = await pool.query(
        'SELECT is_verified_expert FROM users WHERE id = $1 LIMIT 1',
        [host_user_id]
      );
      if (!hostResult.rows[0]?.is_verified_expert) {
        return NextResponse.json(
          { error: 'Selected expert host is not verified yet.' },
          { status: 403 }
        );
      }
    }

    if (!title || !event_date || !required_expertise) {
      return NextResponse.json(
        { error: 'Missing required fields: title, event_date, required_expertise' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO events (
        title,
        description,
        trail_id,
        event_date,
        organizer_name,
        organizer_email,
        max_participants,
        meeting_point,
        difficulty,
        required_expertise,
        sport_type,
        city,
        price_npr,
        qr_image_url,
        host_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
      sport_type || null,
      city || null,
      price_npr,
      qr_image_url || null,
      (auth.role === 'expert' ? auth.sub : host_user_id) || null,
    ]);

    const event: Event = result.rows[0];

    if (trail_request_id) {
      if (auth.role === 'admin') {
        await pool.query('DELETE FROM trail_interest_requests WHERE id = $1', [
          trail_request_id,
        ]);
      } else {
        await pool.query(
          `
          DELETE FROM trail_interest_requests
          WHERE id = $1 AND assigned_expert_user_id = $2
        `,
          [trail_request_id, auth.sub]
        );
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
