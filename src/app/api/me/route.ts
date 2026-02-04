import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const result = await pool.query(
      `
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
      [auth.sub]
    );

    const user: User | null = result.rows[0] || null;
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current user' },
      { status: 500 }
    );
  }
}
