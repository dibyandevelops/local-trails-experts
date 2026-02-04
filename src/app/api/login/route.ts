import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { User, UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role } = body as { email?: string; role?: UserRole };

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, role' },
        { status: 400 }
      );
    }

    if (role === 'participant') {
      return NextResponse.json(
        { error: 'Participants do not need to log in.' },
        { status: 400 }
      );
    }

    const query = `
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, created_at, updated_at
      FROM users
      WHERE email = $1 AND role = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [email, role]);
    const user: User | undefined = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: 'No user found for that email and role.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    );
  }
}
