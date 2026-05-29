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
        is_hidden,
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

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      is_hidden?: boolean;
    };
    const id = (body.id || '').trim();

    if (!id || typeof body.is_hidden !== 'boolean') {
      return NextResponse.json(
        { error: 'id and is_hidden are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE users
      SET is_hidden = $2,
          updated_at = NOW()
      WHERE id = $1
        AND role = 'expert'
      RETURNING id, is_hidden
      `,
      [id, body.is_hidden]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating admin user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
