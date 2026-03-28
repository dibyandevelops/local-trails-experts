import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import type { User, UserRole } from '@/types';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'login', 10, 60);
    if (limited) return limited;

    const body = await request.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    const query = `
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, created_at, updated_at
      , password_hash
      FROM users
      WHERE email = $1
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'expert' THEN 2 ELSE 3 END
      LIMIT 1
    `;

    const result = await pool.query(query, [email]);
    const userRow = result.rows[0];

    if (!userRow) {
      return NextResponse.json(
        { error: 'No user found for that email.' },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      userRow.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Incorrect password.' },
        { status: 401 }
      );
    }

    const token = signAuthToken({
      sub: userRow.id,
      role: userRow.role,
      email: userRow.email,
    });

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [
      userRow.id,
    ]);

    const user: User = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      bio: userRow.bio,
      city: userRow.city,
      sports: userRow.sports,
      is_verified_expert: userRow.is_verified_expert,
      created_at: userRow.created_at,
      updated_at: userRow.updated_at,
    };

    const response = NextResponse.json({ user }, { status: 200 });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    );
  }
}
