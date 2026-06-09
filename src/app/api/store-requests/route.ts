import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  store_name: z.string().trim().min(1).max(180),
  city: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(240),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  contact_name: z.string().trim().max(120).optional().nullable(),
  contact_email: z.string().trim().email().max(254).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  services: z.string().trim().max(1000).optional().nullable(),
  website: z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      z.string().trim().url().max(2000).optional().nullable()
    ),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'store-request', 3, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

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
    } = parsed.data;

    if (!store_name || !city || !location || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: store_name, city, location, latitude, longitude' },
        { status: 400 }
      );
    }

    if (auth?.role !== 'admin') {
      if (!contact_name || !contact_email) {
        return NextResponse.json(
          { error: 'Missing required fields: contact_name, contact_email' },
          { status: 400 }
        );
      }
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
