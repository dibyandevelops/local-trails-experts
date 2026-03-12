import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT id, name, location, sport_type, difficulty, created_at, is_hidden
      FROM trails
      WHERE submitted_by_user_id = $1
      ORDER BY created_at DESC
      `,
      [auth.sub]
    );

    return NextResponse.json({ trails: result.rows || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert trails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expert trails' },
      { status: 500 }
    );
  }
}
