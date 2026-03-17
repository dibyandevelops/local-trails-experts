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
    const { name, email, city, sports, credentials, phone, password, profile_photo_url } = body;
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

    const existingApp = await pool.query(
      `
      SELECT id, status
      FROM expert_applications
      WHERE email = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (existingApp.rows[0]?.status === 'pending') {
      return NextResponse.json(
        { error: 'Your expert application is already pending review.' },
        { status: 409 }
      );
    }

    const existingUser = await pool.query(
      'SELECT id, password_hash, role, is_verified_expert FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const userRow = existingUser.rows[0];
      if (userRow.role === 'expert' && userRow.is_verified_expert) {
        return NextResponse.json(
          { error: 'You are already verified as an expert. Please log in.' },
          { status: 409 }
        );
      }

      const existingPhoneUser = await pool.query(
        'SELECT id FROM users WHERE phone = $1 AND email <> $2 LIMIT 1',
        [normalizedPhone, email]
      );
      if (existingPhoneUser.rows.length > 0) {
        return NextResponse.json(
          { error: 'Phone number is already registered. Please use another number.' },
          { status: 409 }
        );
      }

      const sportsJson = Array.isArray(sports) && sports.length > 0
        ? JSON.stringify(sports)
        : null;

      await pool.query(
        `
        UPDATE users
        SET role = 'expert',
            is_verified_expert = FALSE,
            bio = COALESCE($2, bio),
            city = COALESCE($3, city),
            sports = COALESCE($4::jsonb, sports),
            phone = COALESCE($5, phone),
            profile_photo_url = COALESCE($6, profile_photo_url)
        WHERE id = $1
      `,
        [
          userRow.id,
          credentials,
          city || null,
          sportsJson,
          normalizedPhone,
          profile_photo_url || null,
        ]
      );

      if (existingApp.rows[0]?.id) {
        await pool.query(
          `
          UPDATE expert_applications
          SET name = $1,
              city = $2,
              sports = $3::jsonb,
              credentials = $4,
              profile_photo_url = $5,
              status = 'pending',
              reviewed_at = NULL
          WHERE id = $6
          `,
          [name, city || null, sportsJson, credentials, profile_photo_url || null, existingApp.rows[0].id]
        );
      } else {
        await pool.query(
          `
          INSERT INTO expert_applications (name, email, city, sports, credentials, profile_photo_url, status)
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'pending')
          `,
          [name, email, city || null, sportsJson, credentials, profile_photo_url || null]
        );
      }

      const pendingEmail = buildBrandedEmail({
        subject: 'Expert application received',
        appUrl: getAppUrl(),
        headline: 'Application submitted',
        subhead: 'We will review your credentials shortly.',
        greetingName: name,
        bodyHtml: 'Your expert application has been received and is pending admin review.',
        bodyText: 'Your expert application has been received and is pending admin review.',
      });
      await sendEmailSafe({
        to: email,
        ...pendingEmail,
        dedupeKey: `expert-application:pending:${email}`,
      });

      return NextResponse.json(
        {
          message: 'Your expert application has been submitted and is pending review.',
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

    // Create user with expert role (pending verification)
    const query = `
      INSERT INTO users (name, email, password_hash, role, bio, city, sports, is_verified_expert, phone, profile_photo_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, FALSE, $8, $9)
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
      profile_photo_url || null,
    ]);

    const user = result.rows[0];

    await pool.query(
      `
      INSERT INTO expert_applications (name, email, city, sports, credentials, profile_photo_url, status)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'pending')
      `,
      [name, email, city || null, sportsJson, credentials, profile_photo_url || null]
    );

    const welcomeExpertEmail = buildBrandedEmail({
      subject: 'Expert application received',
      appUrl: getAppUrl(),
      headline: 'Application submitted',
      subhead: 'We will review your credentials shortly.',
      greetingName: name,
      bodyHtml: 'Your expert application has been received and is pending admin review.',
      bodyText: 'Your expert application has been received and is pending admin review.',
    });
    await sendEmailSafe({
      to: email,
      ...welcomeExpertEmail,
      dedupeKey: `expert-application:pending:${email}`,
    });

    return NextResponse.json(
      {
        user,
        message: 'Your expert application has been submitted and is pending review.',
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
