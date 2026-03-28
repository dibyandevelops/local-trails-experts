import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const body = await request.json();

    const {
      store_name,
      city,
      location,
      latitude,
      longitude,
      contact_name,
      contact_email,
      phone,
      services,
      website,
    } = body || {};

    if (!store_name || !city || !location || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: store_name, city, location, latitude, longitude' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO store_requests (
        store_name, city, location, latitude, longitude,
        contact_name, contact_email, phone, services, website
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        store_name,
        city,
        location,
        latitude,
        longitude,
        contact_name || null,
        contact_email || null,
        phone || null,
        services || null,
        website || null,
      ]
    );

    const requestRow = result.rows[0];

    if (auth?.role === 'admin') {
      const storeResult = await pool.query(
        `
        INSERT INTO stores (name, city, location, latitude, longitude, services, hours, phone, website, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
        RETURNING *
        `,
        [
          requestRow.store_name,
          requestRow.city,
          requestRow.location,
          requestRow.latitude,
          requestRow.longitude,
          requestRow.services || null,
          null,
          requestRow.phone || null,
          requestRow.website || null,
        ]
      );

      await pool.query(
        `
        UPDATE store_requests
        SET status = 'approved',
            reviewed_by_admin_id = $1,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        `,
        [auth.sub, requestRow.id]
      );

      return NextResponse.json({ store: storeResult.rows[0], request: requestRow }, { status: 201 });
    }

    return NextResponse.json({ request: requestRow }, { status: 201 });
  } catch (error) {
    console.error('Error creating store request:', error);
    return NextResponse.json({ error: 'Failed to submit store request' }, { status: 500 });
  }
}
