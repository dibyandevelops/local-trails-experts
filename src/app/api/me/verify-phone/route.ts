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
    const { phone } = body as { phone?: string };

    const result = await pool.query(
      `
      UPDATE users
      SET phone = COALESCE($1, phone),
          phone_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, phone, phone_verified_at
    `,
      [phone || null, auth.sub]
    );

    return NextResponse.json({ user: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error verifying phone:', error);
    return NextResponse.json(
      { error: 'Failed to verify phone' },
      { status: 500 }
    );
  }
}
