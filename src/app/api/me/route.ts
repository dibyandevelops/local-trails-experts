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
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, google_sub, profile_photo_url,
             verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_links,
             created_at, updated_at
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
    const {
      name,
      city,
      bio,
      sports,
      phone,
      profile_photo_url,
      verification_years_experience,
      verification_certifications,
      verification_guiding_history,
      verification_safety_training,
      verification_links,
    } = body as {
      name?: string;
      city?: string;
      bio?: string;
      sports?: string[];
      phone?: string;
      profile_photo_url?: string;
      verification_years_experience?: string;
      verification_certifications?: string;
      verification_guiding_history?: string;
      verification_safety_training?: string;
      verification_links?: string;
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
          verification_years_experience = $7,
          verification_certifications = $8,
          verification_guiding_history = $9,
          verification_safety_training = $10,
          verification_links = $11,
          updated_at = NOW()
      WHERE id = $12
      RETURNING id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, google_sub, profile_photo_url,
                verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_links,
                created_at, updated_at
    `,
      [
        name || null,
        city || null,
        bio || null,
        sportsJson,
        normalizedPhone || null,
        profile_photo_url || null,
        verification_years_experience || null,
        verification_certifications || null,
        verification_guiding_history || null,
        verification_safety_training || null,
        verification_links || null,
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
