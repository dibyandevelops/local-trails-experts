import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type AllowedRole = 'expert' | 'participant';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = request.nextUrl.searchParams.get('role') as AllowedRole | null;
    if (!role || (role !== 'expert' && role !== 'participant')) {
      return NextResponse.json(
        { error: 'role must be expert or participant' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        city,
        sports,
        phone,
        verification_years_experience,
        verification_certifications,
        verification_guiding_history,
        verification_safety_training,
        verification_achievements,
        verification_strava_url,
        verification_links,
        created_at
      FROM users
      WHERE role = $1
      ORDER BY created_at DESC
      `,
      [role]
    );

    return NextResponse.json({ users: result.rows || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
