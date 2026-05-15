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
      SELECT id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, availability_weekdays, google_sub, profile_photo_url,
             verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_achievements, verification_strava_url, verification_links,
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
      availability_weekdays,
      profile_photo_url,
      verification_years_experience,
      verification_certifications,
      verification_guiding_history,
      verification_safety_training,
      verification_achievements,
      verification_strava_url,
      verification_links,
    } = body as {
      name?: string;
      city?: string;
      bio?: string;
      sports?: string[];
      phone?: string;
      availability_weekdays?: string[];
      profile_photo_url?: string;
      verification_years_experience?: string;
      verification_certifications?: string;
      verification_guiding_history?: string;
      verification_safety_training?: string;
      verification_achievements?: string;
      verification_strava_url?: string;
      verification_links?: string;
    };

    if (
      typeof profile_photo_url === 'string' &&
      profile_photo_url.startsWith('data:image/') &&
      profile_photo_url.length > 350_000
    ) {
      return NextResponse.json(
        { error: 'Profile photo is too large. Please upload a smaller image.' },
        { status: 413 }
      );
    }

    const existingUserResult = await pool.query(
      `
      SELECT
        name, city, bio, sports, phone, availability_weekdays, profile_photo_url,
        verification_years_experience, verification_certifications, verification_guiding_history,
        verification_safety_training, verification_achievements, verification_strava_url, verification_links
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [auth.sub]
    );
    const existingUser = existingUserResult.rows[0];
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const hasOwn = <K extends string>(key: K) =>
      Object.prototype.hasOwnProperty.call(body, key);

    const nextSports =
      hasOwn('sports')
        ? Array.isArray(sports) && sports.length > 0
          ? sports
          : null
        : existingUser.sports ?? null;
    const sportsJson = nextSports ? JSON.stringify(nextSports) : null;

    const nextWeekdays =
      hasOwn('availability_weekdays')
        ? Array.isArray(availability_weekdays) && availability_weekdays.length > 0
          ? availability_weekdays
          : null
        : existingUser.availability_weekdays ?? null;
    const weekdaysJson = nextWeekdays ? JSON.stringify(nextWeekdays) : null;

    const normalizedPhone =
      hasOwn('phone')
        ? typeof phone === 'string'
          ? phone.trim()
          : ''
        : existingUser.phone;

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

    const nextVerificationStravaUrl =
      hasOwn('verification_strava_url')
        ? typeof verification_strava_url === 'string'
          ? verification_strava_url.trim()
          : ''
        : existingUser.verification_strava_url || '';

    if (nextVerificationStravaUrl) {
      const isValidStravaUrl = /^https?:\/\/(www\.)?strava\.com\/.+/i.test(nextVerificationStravaUrl);
      if (!isValidStravaUrl) {
        return NextResponse.json(
          { error: 'Invalid Strava URL. Use https://www.strava.com/...' },
          { status: 400 }
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
          availability_weekdays = $7::jsonb,
          verification_years_experience = $8,
          verification_certifications = $9,
          verification_guiding_history = $10,
          verification_safety_training = $11,
          verification_achievements = $12,
          verification_strava_url = $13,
          verification_links = $14,
          updated_at = NOW()
      WHERE id = $15
      RETURNING id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, availability_weekdays, google_sub, profile_photo_url,
                verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_achievements, verification_strava_url, verification_links,
                created_at, updated_at
    `,
      [
        hasOwn('name') ? (name || null) : existingUser.name,
        hasOwn('city') ? (city || null) : existingUser.city,
        hasOwn('bio') ? (bio || null) : existingUser.bio,
        sportsJson,
        normalizedPhone || null,
        hasOwn('profile_photo_url') ? (profile_photo_url || null) : existingUser.profile_photo_url,
        weekdaysJson,
        hasOwn('verification_years_experience')
          ? (verification_years_experience || null)
          : existingUser.verification_years_experience,
        hasOwn('verification_certifications')
          ? (verification_certifications || null)
          : existingUser.verification_certifications,
        hasOwn('verification_guiding_history')
          ? (verification_guiding_history || null)
          : existingUser.verification_guiding_history,
        hasOwn('verification_safety_training')
          ? (verification_safety_training || null)
          : existingUser.verification_safety_training,
        hasOwn('verification_achievements')
          ? (verification_achievements || null)
          : existingUser.verification_achievements,
        hasOwn('verification_strava_url')
          ? (nextVerificationStravaUrl || null)
          : existingUser.verification_strava_url,
        hasOwn('verification_links')
          ? (verification_links || null)
          : existingUser.verification_links,
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
