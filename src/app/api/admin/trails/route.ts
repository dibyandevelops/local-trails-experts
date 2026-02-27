import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'pending';
    const result = await pool.query(
      `
      SELECT
        t.*,
        u.name AS submitted_by_name,
        u.email AS submitted_by_email
      FROM trails t
      LEFT JOIN users u ON u.id = t.submitted_by_user_id
      WHERE t.status = $1::varchar
      ORDER BY t.created_at DESC
      `,
      [status]
    );

    return NextResponse.json({ trails: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pending trails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trails' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body?.id || '').trim();
    const status = String(body?.status || '').trim();
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'id and valid status are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE trails
      SET
        status = $1::varchar,
        approved_by_admin_id = $2,
        approved_at = CASE
          WHEN $1::varchar = 'approved'::varchar THEN NOW()
          ELSE approved_at
        END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [status, auth.sub, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    return NextResponse.json({ trail: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error approving/rejecting trail:', error);
    return NextResponse.json(
      { error: 'Failed to update trail status' },
      { status: 500 }
    );
  }
}
