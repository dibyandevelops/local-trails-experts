import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { Trail } from '@/types';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeSafetyLabels } from '@/lib/trail-safety';
import { parseGPX } from '@/lib/gpx-parser';

function parseOptionalNumber(raw: string | null) {
  if (!raw || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty');
    const location = searchParams.get('location');

    let query = 'SELECT * FROM trails WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (location) {
      query += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    const trails: Trail[] = result.rows;

    return NextResponse.json({ trails }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trails' },
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

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'GPX upload is required. Submit as multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const difficulty = String(formData.get('difficulty') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const image_url = String(formData.get('image_url') || '').trim();
    const estimated_time_hours = parseOptionalNumber(
      String(formData.get('estimated_time_hours') || '')
    );
    const distanceOverride = parseOptionalNumber(
      String(formData.get('distance_km') || '')
    );
    const elevationOverride = parseOptionalNumber(
      String(formData.get('elevation_gain_m') || '')
    );

    const rawSafety = String(formData.get('safety_labels') || '').trim();
    let safetyLabelsInput: unknown = [];
    if (rawSafety) {
      try {
        safetyLabelsInput = JSON.parse(rawSafety);
      } catch {
        safetyLabelsInput = [];
      }
    }

    const gpxFile = formData.get('gpx_file') as File | null;
    if (!gpxFile) {
      return NextResponse.json(
        { error: 'GPX file is required.' },
        { status: 400 }
      );
    }
    if (!gpxFile.name.toLowerCase().endsWith('.gpx')) {
      return NextResponse.json(
        { error: 'Only GPX files are supported.' },
        { status: 400 }
      );
    }

    if (!name || !difficulty || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, difficulty, location' },
        { status: 400 }
      );
    }

    const hasSafetyLabelsField = rawSafety.length > 0;
    if (hasSafetyLabelsField && auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can set safety labels' },
        { status: 403 }
      );
    }

    const routeData = await parseGPX(await gpxFile.text());
    const firstPoint = routeData.coordinates[0];
    const latitude = firstPoint?.latitude ?? null;
    const longitude = firstPoint?.longitude ?? null;
    const distance_km = distanceOverride ?? routeData.totalDistance ?? null;
    const elevation_gain_m =
      elevationOverride ?? routeData.elevationGain ?? null;

    const result = await pool.query(
      `
      INSERT INTO trails (
        name, description, difficulty, location, latitude, longitude,
        distance_km, elevation_gain_m, estimated_time_hours, image_url, safety_labels, route_data
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
      RETURNING *
      `,
      [
        name,
        description || null,
        difficulty,
        location,
        latitude,
        longitude,
        distance_km,
        elevation_gain_m,
        estimated_time_hours ?? null,
        image_url ?? null,
        auth.role === 'admin' ? normalizeSafetyLabels(safetyLabelsInput) : [],
        JSON.stringify(routeData),
      ]
    );

    return NextResponse.json({ trail: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating trail:', error);
    return NextResponse.json(
      { error: 'Failed to create trail' },
      { status: 500 }
    );
  }
}
