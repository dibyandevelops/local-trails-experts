import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { buildWelcomeEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'register', 5, 60);
    if (limited) return limited;

    const body = await request.json();
    const { name, email, sports, password, phone, city } = body as {
      name?: string;
      email?: string;
      sports?: string[];
      password?: string;
      phone?: string;
      city?: string;
    };

    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, phone' },
        { status: 400 }
      );
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include a number.' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    const existingPhone = await pool.query(
      'SELECT id FROM users WHERE phone = $1 LIMIT 1',
      [normalizedPhone]
    );
    if (existingPhone.rows.length > 0) {
      return NextResponse.json(
        { error: 'Phone number is already registered.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const sportsJson =
      Array.isArray(sports) && sports.length > 0
        ? JSON.stringify(sports)
        : null;

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, sports, phone, city)
      VALUES ($1, $2, $3, 'participant', $4::jsonb, $5, $6)
      RETURNING id, email, role
    `,
      [name, email, passwordHash, sportsJson, normalizedPhone, city || null]
    );

    const user = result.rows[0];
    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const response = NextResponse.json({ success: true, user }, { status: 201 });
    setAuthCookie(response, token);

    const { subject, text, html } = buildWelcomeEmail({
      name,
      appUrl: getAppUrl(),
    });
    const fromBase =
      (process.env.RESEND_FROM || process.env.EMAIL_FROM || '').trim() ||
      'Local Guides <onboarding@resend.dev>';
    const from =
      fromBase.includes('<') && fromBase.includes('>')
        ? fromBase.replace(/^[^<]+/, `${name} via Local Guides `)
        : `${name} via Local Guides <${fromBase}>`;

    await sendEmailSafe({
      to: email,
      subject,
      text,
      html,
      from,
      replyTo: email,
    });

    return response;
  } catch (error) {
    console.error('Error registering participant:', error);
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  }
}
