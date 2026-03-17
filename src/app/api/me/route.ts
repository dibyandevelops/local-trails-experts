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
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, google_sub, profile_photo_url, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
      [auth.sub]
    );

    const user: User | null = result.rows[0] || null;
    return NextResponse.json(
      { user },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, city, bio, sports, phone, profile_photo_url } = body as {
      name?: string;
      city?: string;
      bio?: string;
      sports?: string[];
      phone?: string;
      profile_photo_url?: string;
    };

    const sportsJson =
      Array.isArray(sports) && sports.length > 0
        ? JSON.stringify(sports)
        : null;

    const normalizedPhone =
      typeof phone === 'string' ? phone.trim() : phone;

    if (normalizedPhone) {
      const existingPhone = await pool.query(
        'SELECT id FROM users WHERE phone = $1 AND id <> $2 LIMIT 1',
        [normalizedPhone, auth.sub]
      );
      if (existingPhone.rows.length > 0) {
        return NextResponse.json(
          { error: 'Phone number is already in use.' },
          { status: 409 }
        );
      }
    }

    const result = await pool.query(
      `
      UPDATE users
      SET name = $1,
          city = $2,
          bio = $3,
          sports = $4::jsonb,
          phone = $5,
          profile_photo_url = $6,
          updated_at = NOW()
      WHERE id = $7
      RETURNING id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, google_sub, profile_photo_url, created_at, updated_at
    `,
      [
        name || null,
        city || null,
        bio || null,
        sportsJson,
        normalizedPhone || null,
        profile_photo_url || null,
        auth.sub,
      ]
    );

    const user: User | null = result.rows[0] || null;
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
