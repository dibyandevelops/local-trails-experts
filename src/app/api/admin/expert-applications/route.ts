import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

type ExpertApplicationStatus = 'pending' | 'approved' | 'rejected';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as ExpertApplicationStatus | null;

    const params: any[] = [];
    let whereClause = '';

    if (status) {
      whereClause = 'WHERE status = $1';
      params.push(status);
    }

    const query = `
      SELECT
        id,
        name,
        email,
        city,
        sports,
        credentials,
        status,
        created_at,
        reviewed_at
      FROM expert_applications
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, params);
    return NextResponse.json({ applications: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert applications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body as {
      id?: string;
      status?: ExpertApplicationStatus;
    };

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const query = `
      UPDATE expert_applications
      SET status = $1, reviewed_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, status, reviewed_at
    `;

    const result = await pool.query(query, [status, id]);
    const updated = result.rows[0];

    if (!updated) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ application: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating expert application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
