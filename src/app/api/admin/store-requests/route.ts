import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM store_requests
      WHERE status = 'pending'
      ORDER BY created_at DESC
      `
    );

    return NextResponse.json({ requests: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching store requests:', error);
    return NextResponse.json({ error: 'Failed to fetch store requests' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action } = body || {};

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    if (action === 'approve') {
      const requestResult = await pool.query(
        `SELECT * FROM store_requests WHERE id = $1`,
        [id]
      );
      if (requestResult.rows.length === 0) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }
      const req = requestResult.rows[0];

      const storeResult = await pool.query(
        `
        INSERT INTO stores (name, city, location, latitude, longitude, services, hours, phone, website, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
        RETURNING *
        `,
        [
          req.store_name,
          req.city,
          req.location,
          req.latitude,
          req.longitude,
          req.services || null,
          null,
          req.phone || null,
          req.website || null,
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
        [auth.sub, id]
      );

      return NextResponse.json({ store: storeResult.rows[0] }, { status: 200 });
    }

    if (action === 'reject') {
      await pool.query(
        `
        UPDATE store_requests
        SET status = 'rejected',
            reviewed_by_admin_id = $1,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        `,
        [auth.sub, id]
      );

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating store request:', error);
    return NextResponse.json({ error: 'Failed to update store request' }, { status: 500 });
  }
}
