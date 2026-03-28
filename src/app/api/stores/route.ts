import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { Store } from '@/types';

function toNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const search = (searchParams.get('search') || '').trim();
    const lat = toNumber(searchParams.get('lat'));
    const lng = toNumber(searchParams.get('lng'));
    const radius = Math.max(1, Number(searchParams.get('radius') || '25')) || 25;
    const minLat = toNumber(searchParams.get('minLat'));
    const maxLat = toNumber(searchParams.get('maxLat'));
    const minLng = toNumber(searchParams.get('minLng'));
    const maxLng = toNumber(searchParams.get('maxLng'));

    const params: any[] = [];
    let paramIndex = 1;

    let where = 'WHERE is_active = TRUE';
    if (city) {
      where += ` AND city = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }
    if (search) {
      where += ` AND (name ILIKE $${paramIndex} OR location ILIKE $${paramIndex} OR services ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (
      minLat !== null &&
      maxLat !== null &&
      minLng !== null &&
      maxLng !== null
    ) {
      where += ` AND latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      where += ` AND longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`;
      params.push(minLat, maxLat, minLng, maxLng);
      paramIndex += 4;
    }

    const distanceSelect =
      lat !== null && lng !== null
        ? `, (6371 * 2 * ASIN(SQRT(POWER(SIN(RADIANS(latitude - $${paramIndex}) / 2), 2) + COS(RADIANS($${paramIndex})) * COS(RADIANS(latitude)) * POWER(SIN(RADIANS(longitude - $${paramIndex +
            1}) / 2), 2)))) AS distance_km`
        : `, NULL::double precision AS distance_km`;

    if (lat !== null && lng !== null) {
      params.push(lat, lng);
      paramIndex += 2;
    }

    let query = `
      SELECT
        id, name, city, location, latitude, longitude,
        services, hours, phone, website, is_active, created_at, updated_at
        ${distanceSelect}
      FROM stores
      ${where}
    `;

    if (lat !== null && lng !== null) {
      query += ` ORDER BY distance_km ASC NULLS LAST`;
    } else {
      query += ` ORDER BY city ASC, name ASC`;
    }

    const result = await pool.query(query, params);
    const stores = result.rows as Store[];

    const hasBounds =
      minLat !== null && maxLat !== null && minLng !== null && maxLng !== null;
    const filtered =
      lat !== null && lng !== null && !hasBounds
        ? stores.filter((store) => store.distance_km == null || store.distance_km <= radius)
        : stores;

    return NextResponse.json({ stores: filtered }, { status: 200 });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Partial<Store>;

    if (!body.name || !body.city || !body.location || !body.latitude || !body.longitude) {
      return NextResponse.json(
        { error: 'Missing required fields: name, city, location, latitude, longitude' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO stores (name, city, location, latitude, longitude, services, hours, phone, website, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        body.name,
        body.city,
        body.location,
        body.latitude,
        body.longitude,
        body.services || null,
        body.hours || null,
        body.phone || null,
        body.website || null,
        body.is_active ?? true,
      ]
    );

    return NextResponse.json({ store: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
