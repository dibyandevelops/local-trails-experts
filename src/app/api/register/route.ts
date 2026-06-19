import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { setAuthCookie, signAuthToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { buildWelcomeEmail, getAppUrl } from '@/lib/email-templates';

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

function normalizePhoneForStorage(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('9')) {
    return `+977${digits}`;
  }
  if (digits.length === 13 && digits.startsWith('977')) {
    return `+${digits}`;
  }
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'register', 5, 60);
    if (limited) return limited;

    const body = await request.json();
    const { name, email, sports, password, phone, city, profile_photo_url } = body as {
      name?: string;
      email?: string;
      sports?: string[];
      password?: string;
      phone?: string;
      city?: string;
      profile_photo_url?: string;
    };

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedName =
      (typeof name === 'string' && name.trim()) ||
      (normalizedEmail ? normalizedEmail.split('@')[0] : '') ||
      'Participant';

    if (!normalizedEmail || !password || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, phone' },
        { status: 400 }
      );
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include a number.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneForStorage(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    const phoneCandidates = phoneLoginCandidates(normalizedPhone);
    const existingPhone = await pool.query(
      `
      SELECT id
      FROM users
      WHERE regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ANY($1::text[])
      LIMIT 1
      `,
      [phoneCandidates]
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

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, sports, phone, city, profile_photo_url)
      VALUES ($1, $2, $3, 'participant', $4::jsonb, $5, $6, $7)
      RETURNING id, email, role
    `,
      [normalizedName, normalizedEmail, passwordHash, sportsJson, normalizedPhone, city || null, profile_photo_url || null]
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
      name: normalizedName,
      appUrl: getAppUrl(),
      role: 'participant',
    });
    const fromBase =
      (process.env.RESEND_FROM || process.env.EMAIL_FROM || '').trim() ||
      'LocoXperts <onboarding@resend.dev>';
    const from =
      fromBase.includes('<') && fromBase.includes('>')
        ? fromBase.replace(/^[^<]+/, `${normalizedName} via LocoXperts `)
        : `${normalizedName} via LocoXperts <${fromBase}>`;

    await sendEmailSafe({
      to: normalizedEmail,
      subject,
      text,
      html,
      from,
      replyTo: normalizedEmail,
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
