import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import type { User } from '@/types';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

function phoneLoginCandidates(identifier: string) {
  const digits = identifier.replace(/\D/g, '');
  if (!digits) return [];
  const candidates = new Set([digits]);
  if (digits.length === 10 && digits.startsWith('9')) {
    candidates.add(`977${digits}`);
  }
  if (digits.length === 13 && digits.startsWith('977')) {
    candidates.add(digits.slice(3));
  }
  return Array.from(candidates);
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'login', 10, 60);
    if (limited) return limited;

    const body = await request.json();
    const { identifier, email, password } = body as {
      identifier?: string;
      email?: string;
      password?: string;
    };
    const loginIdentifier = (identifier || email || '').trim();

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: email or phone, password' },
        { status: 400 }
      );
    }

    const phoneCandidates = phoneLoginCandidates(loginIdentifier);
    const query = `
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, created_at, updated_at
      , password_hash
      FROM users
      WHERE lower(email) = lower($1)
        OR regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ANY($2::text[])
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'expert' THEN 2 ELSE 3 END
      LIMIT 1
    `;

    const result = await pool.query(query, [loginIdentifier, phoneCandidates]);
    const userRow = result.rows[0];

    if (!userRow) {
      return NextResponse.json(
        { error: 'Invalid email, phone, or password.' },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      userRow.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid email, phone, or password.' },
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
      phone: userRow.phone,
      phone_verified_at: userRow.phone_verified_at,
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
