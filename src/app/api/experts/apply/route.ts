import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getAuthFromRequest, setAuthCookie, signAuthToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import type { UserRole } from '@/types';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'expert-apply', 5, 60);
    if (limited) return limited;

    const body = await request.json();
    const {
      name,
      email,
      city,
      sports,
      credentials,
      phone,
      password,
      profile_photo_url,
      verification_years_experience,
      verification_certifications,
      verification_guiding_history,
      verification_safety_training,
      verification_achievements,
      verification_strava_url,
      verification_links,
    } = body;
    const auth = getAuthFromRequest(request);
    const authenticatedUser = auth
      ? (
          await pool.query(
            'SELECT id, name, email, phone, role, is_verified_expert FROM users WHERE id = $1 LIMIT 1',
            [auth.sub]
          )
        ).rows[0]
      : null;
    if (auth && !authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const applicationName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : authenticatedUser?.name || '';
    const applicationEmail = authenticatedUser?.email || (typeof email === 'string' ? email.trim() : '');
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
    const applicationPhone = normalizedPhone || authenticatedUser?.phone || '';

    if (!applicationName || !applicationEmail || !credentials || !applicationPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, credentials, phone' },
        { status: 400 }
      );
    }

    if (!authenticatedUser && (!password || password.length < 8 || !/\d/.test(password))) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include a number.' },
        { status: 400 }
      );
    }

    const normalizedVerificationStravaUrl =
      typeof verification_strava_url === 'string' ? verification_strava_url.trim() : '';
    if (
      normalizedVerificationStravaUrl &&
      !/^https?:\/\/(www\.)?strava\.com\/.+/i.test(normalizedVerificationStravaUrl)
    ) {
      return NextResponse.json(
        { error: 'Invalid Strava URL. Use https://www.strava.com/...' },
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
      [applicationEmail]
    );

    if (existingApp.rows[0]?.status === 'pending' && !authenticatedUser) {
      return NextResponse.json(
        { error: 'Your expert application is already pending review.' },
        { status: 409 }
      );
    }

    const existingUser = await pool.query(
      'SELECT id, password_hash, role, is_verified_expert FROM users WHERE email = $1 LIMIT 1',
      [applicationEmail]
    );

    if (existingUser.rows.length > 0) {
      const userRow = existingUser.rows[0];
      if (userRow.role === 'expert' && userRow.is_verified_expert) {
        return NextResponse.json(
          { error: 'You are already verified as an expert. Please log in.' },
          { status: 409 }
        );
      }
      if (userRow.role !== 'participant' && userRow.role !== 'expert') {
        return NextResponse.json(
          { error: 'Use a separate participant account to apply as an expert.' },
          { status: 409 }
        );
      }

      const existingPhoneUser = await pool.query(
        'SELECT id FROM users WHERE phone = $1 AND email <> $2 LIMIT 1',
        [applicationPhone, applicationEmail]
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
            profile_photo_url = COALESCE($6, profile_photo_url),
            verification_years_experience = COALESCE($7, verification_years_experience),
            verification_certifications = COALESCE($8, verification_certifications),
            verification_guiding_history = COALESCE($9, verification_guiding_history),
            verification_safety_training = COALESCE($10, verification_safety_training),
            verification_achievements = COALESCE($11, verification_achievements),
            verification_strava_url = COALESCE($12, verification_strava_url),
            verification_links = COALESCE($13, verification_links)
        WHERE id = $1
      `,
        [
          userRow.id,
          credentials,
          city || null,
          sportsJson,
          applicationPhone,
          profile_photo_url || null,
          verification_years_experience || null,
          verification_certifications || null,
          verification_guiding_history || null,
          verification_safety_training || null,
          verification_achievements || null,
          normalizedVerificationStravaUrl || null,
          verification_links || null,
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
              verification_years_experience = $6,
              verification_certifications = $7,
              verification_guiding_history = $8,
              verification_safety_training = $9,
              verification_achievements = $10,
              verification_strava_url = $11,
              verification_links = $12,
              status = 'pending',
              reviewed_at = NULL
          WHERE id = $13
          `,
          [
            applicationName,
            city || null,
            sportsJson,
            credentials,
            profile_photo_url || null,
            verification_years_experience || null,
            verification_certifications || null,
            verification_guiding_history || null,
            verification_safety_training || null,
            verification_achievements || null,
            normalizedVerificationStravaUrl || null,
            verification_links || null,
            existingApp.rows[0].id,
          ]
        );
      } else {
        await pool.query(
          `
          INSERT INTO expert_applications (
            name, email, city, sports, credentials, profile_photo_url,
            verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_achievements, verification_strava_url, verification_links,
            status
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
          `,
          [
            applicationName,
            applicationEmail,
            city || null,
            sportsJson,
            credentials,
            profile_photo_url || null,
            verification_years_experience || null,
            verification_certifications || null,
            verification_guiding_history || null,
            verification_safety_training || null,
            verification_achievements || null,
            normalizedVerificationStravaUrl || null,
            verification_links || null,
          ]
        );
      }

      const pendingEmail = buildBrandedEmail({
        subject: 'Expert application received',
        appUrl: getAppUrl(),
        headline: 'Application submitted',
        subhead: 'We will review your credentials shortly.',
        greetingName: applicationName,
        bodyHtml: 'Your expert application has been received and is pending admin review.',
        bodyText: 'Your expert application has been received and is pending admin review.',
      });
      await sendEmailSafe({
        to: applicationEmail,
        ...pendingEmail,
        dedupeKey: `expert-application:pending:${applicationEmail}`,
      });

      const response = NextResponse.json(
        {
          message: 'Your expert application has been submitted and is pending review.',
        },
        { status: 200 }
      );
      setAuthCookie(
        response,
        signAuthToken({
          sub: userRow.id,
          role: 'expert',
          email: applicationEmail,
        })
      );
      return response;
    }

    const existingPhoneUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1 LIMIT 1',
      [applicationPhone]
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
      INSERT INTO users (
        name, email, password_hash, role, bio, city, sports, is_verified_expert, phone, profile_photo_url,
        verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_achievements, verification_strava_url, verification_links
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, FALSE, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, name, email, role, created_at
    `;

    const result = await pool.query(query, [
      applicationName,
      applicationEmail,
      passwordHash,
      'expert' as UserRole,
      credentials,
      city || null,
      sportsJson,
      applicationPhone,
      profile_photo_url || null,
      verification_years_experience || null,
      verification_certifications || null,
      verification_guiding_history || null,
      verification_safety_training || null,
      verification_achievements || null,
      normalizedVerificationStravaUrl || null,
      verification_links || null,
    ]);

    const user = result.rows[0];

    await pool.query(
      `
      INSERT INTO expert_applications (
        name, email, city, sports, credentials, profile_photo_url,
        verification_years_experience, verification_certifications, verification_guiding_history, verification_safety_training, verification_achievements, verification_strava_url, verification_links,
        status
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
      `,
      [
        applicationName,
        applicationEmail,
        city || null,
        sportsJson,
        credentials,
        profile_photo_url || null,
        verification_years_experience || null,
        verification_certifications || null,
        verification_guiding_history || null,
        verification_safety_training || null,
        verification_achievements || null,
        normalizedVerificationStravaUrl || null,
        verification_links || null,
      ]
    );

    const welcomeExpertEmail = buildBrandedEmail({
      subject: 'Expert application received',
      appUrl: getAppUrl(),
      headline: 'Application submitted',
      subhead: 'We will review your credentials shortly.',
      greetingName: applicationName,
      bodyHtml: 'Your expert application has been received and is pending admin review.',
      bodyText: 'Your expert application has been received and is pending admin review.',
    });
    await sendEmailSafe({
      to: applicationEmail,
      ...welcomeExpertEmail,
      dedupeKey: `expert-application:pending:${applicationEmail}`,
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
