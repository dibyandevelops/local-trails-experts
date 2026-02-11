import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { firebaseAdminAuth } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'verify-phone', 5, 60);
    if (limited) return limited;

    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, idToken } = body as { phone?: string; idToken?: string };

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing Firebase ID token' },
        { status: 400 }
      );
    }

    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    const verifiedPhone = decoded.phone_number;
    if (!verifiedPhone) {
      return NextResponse.json(
        { error: 'Phone number not verified in Firebase' },
        { status: 400 }
      );
    }

    if (phone && phone !== verifiedPhone) {
      return NextResponse.json(
        { error: 'Phone number mismatch' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE users
      SET phone = COALESCE($1, phone),
          phone_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, phone, phone_verified_at
    `,
      [verifiedPhone, auth.sub]
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
