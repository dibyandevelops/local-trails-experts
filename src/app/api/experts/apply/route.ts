import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import type { UserRole } from '@/types';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'expert-apply', 5, 60);
    if (limited) return limited;

    const body = await request.json();
    const { name, email, city, sports, credentials, phone, password } = body;
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!name || !email || !credentials || !normalizedPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, credentials, phone' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8 || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include a number.' },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      // Check if user already has expert role
      const existingUserData = await pool.query(
        'SELECT role FROM users WHERE email = $1 LIMIT 1',
        [email]
      );

      if (existingUserData.rows[0]?.role === 'expert') {
        return NextResponse.json(
          { error: 'You are already registered as an expert. Please log in.' },
          { status: 409 }
        );
      }

      // Upgrade existing user to expert
      const sportsJson = Array.isArray(sports) && sports.length > 0
        ? JSON.stringify(sports)
        : null;

      await pool.query(
        `
        UPDATE users
        SET role = 'expert',
            is_verified_expert = TRUE,
            bio = COALESCE($2, bio),
            city = COALESCE($3, city),
            sports = COALESCE($4::jsonb, sports),
            phone = COALESCE($5, phone)
        WHERE id = $1
      `,
        [
          existingUser.rows[0].id,
          credentials,
          city || null,
          sportsJson,
          normalizedPhone,
        ]
      );

      const upgradeEmail = buildBrandedEmail({
        subject: 'You are now a Verified Expert',
        appUrl: getAppUrl(),
        headline: 'Verified expert access',
        subhead: 'Your account has been upgraded.',
        greetingName: name,
        bodyHtml: 'You can now log in and start hosting events.',
        bodyText: 'You can now log in and start hosting events.',
      });
      await sendEmailSafe({
        to: email,
        ...upgradeEmail,
      });

      return NextResponse.json(
        {
          message: 'Your account has been upgraded to expert. You can now log in.',
        },
        { status: 200 }
      );
    }

    const existingPhoneUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1 LIMIT 1',
      [normalizedPhone]
    );
    if (existingPhoneUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Phone number is already registered. Please use another number.' },
        { status: 409 }
      );
    }

    // Fix: Ensure sports is passed as a proper JSON string for the JSON column in Postgres
    let sportsJson: string | null = null;
    if (Array.isArray(sports) && sports.length > 0) {
      sportsJson = JSON.stringify(sports);
    }

    // Hash the user-provided password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user directly with expert role (auto-approved)
    const query = `
      INSERT INTO users (name, email, password_hash, role, bio, city, sports, is_verified_expert, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE, $8)
      RETURNING id, name, email, role, created_at
    `;

    const result = await pool.query(query, [
      name,
      email,
      passwordHash,
      'expert' as UserRole,
      credentials,
      city || null,
      sportsJson,
      normalizedPhone,
    ]);

    const user = result.rows[0];

    const welcomeExpertEmail = buildBrandedEmail({
      subject: 'Welcome as a Verified Expert',
      appUrl: getAppUrl(),
      headline: 'Welcome to Local Guides',
      subhead: 'Your expert account is ready.',
      greetingName: name,
      bodyHtml: 'You can now log in and start hosting events.',
      bodyText: 'You can now log in and start hosting events.',
    });
    await sendEmailSafe({
      to: email,
      ...welcomeExpertEmail,
    });

    return NextResponse.json(
      {
        user,
        message: 'Expert account created successfully. You can now log in.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating expert account:', error);
    return NextResponse.json(
      { error: 'Failed to create expert account' },
      { status: 500 }
    );
  }
}
