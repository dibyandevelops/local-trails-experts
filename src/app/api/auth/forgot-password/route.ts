import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmailSafe } from '@/lib/email';
import { buildPasswordResetEmail, getAppUrl } from '@/lib/email-templates';

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

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'forgot-password', 5, 60);
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const identifier = String(body?.identifier || '').trim();

    if (!identifier) {
      return NextResponse.json(
        { error: 'Email or phone number is required.' },
        { status: 400 }
      );
    }

    const phoneCandidates = phoneLoginCandidates(identifier);
    const userResult = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE lower(email) = lower($1)
        OR regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = ANY($2::text[])
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'expert' THEN 2 ELSE 3 END
      LIMIT 1
      `,
      [identifier, phoneCandidates]
    );

    const user = userResult.rows[0];
    if (user?.email) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const appUrl = getAppUrl();
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const userAgent = request.headers.get('user-agent') || null;
      const forwardedFor = request.headers.get('x-forwarded-for') || null;
      const requestedIp = forwardedFor?.split(',')[0]?.trim() || null;

      await pool.query(
        `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1 AND used_at IS NULL
        `,
        [user.id]
      );

      await pool.query(
        `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip, user_agent)
        VALUES ($1, $2, NOW() + INTERVAL '1 hour', $3, $4)
        `,
        [user.id, tokenHash, requestedIp, userAgent]
      );

      const { subject, text, html } = buildPasswordResetEmail({
        appUrl,
        resetUrl,
        name: user.name,
      });

      await sendEmailSafe({
        to: user.email,
        subject,
        text,
        html,
        dedupeKey: `password-reset:${user.id}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists, a password reset link has been sent.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { error: 'Failed to request password reset.' },
      { status: 500 }
    );
  }
}
