import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const token = String(body?.token || '').trim();
    const platform = String(body?.platform || 'web').trim().slice(0, 20);
    const userAgent = String(body?.userAgent || '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Missing push token' }, { status: 400 });
    }

    await pool.query(
      `
      INSERT INTO push_subscriptions (user_id, token, platform, user_agent)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        user_agent = EXCLUDED.user_agent,
        updated_at = NOW()
    `,
      [auth.sub, token, platform || 'web', userAgent || null]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();

    if (token) {
      await pool.query(
        'DELETE FROM push_subscriptions WHERE user_id = $1 AND token = $2',
        [auth.sub, token]
      );
    } else {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [auth.sub]);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}

