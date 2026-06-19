import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'reset-password', 8, 60);
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    const password = String(body?.password || '');

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include a number.' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tokenResult = await client.query(
        `
        SELECT prt.id, prt.user_id
        FROM password_reset_tokens prt
        WHERE prt.token_hash = $1
          AND prt.used_at IS NULL
          AND prt.expires_at > NOW()
        LIMIT 1
        FOR UPDATE
        `,
        [tokenHash]
      );

      const resetToken = tokenResult.rows[0];
      if (!resetToken) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'This reset link is invalid or expired.' },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        `
        UPDATE users
        SET password_hash = $1,
            password_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        `,
        [passwordHash, resetToken.user_id]
      );

      await client.query(
        `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1 AND used_at IS NULL
        `,
        [resetToken.user_id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json(
      { success: true, message: 'Password updated. You can now sign in.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
