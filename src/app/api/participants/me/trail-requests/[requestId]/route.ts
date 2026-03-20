import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;
    const body = await request.json();
    const expertUserId = String(body?.expert_user_id || '').trim();
    const preferredDateRaw = String(body?.preferred_date || '').trim();

    if (!expertUserId || !preferredDateRaw) {
      return NextResponse.json(
        { error: 'Please provide expert and preferred date.' },
        { status: 400 }
      );
    }

    const preferredDate = new Date(preferredDateRaw);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json({ error: 'Invalid preferred date.' }, { status: 400 });
    }

    const existingReq = await pool.query(
      `
      SELECT id
      FROM trail_interest_requests
      WHERE id = $1 AND requester_user_id = $2
      LIMIT 1
      `,
      [requestId, auth.sub]
    );
    if (existingReq.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const expertRes = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1 AND role = 'expert' AND is_verified_expert = true
      LIMIT 1
      `,
      [expertUserId]
    );
    if (expertRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Selected expert is not available.' },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE trail_interest_requests
      SET assigned_expert_user_id = $1,
          preferred_date = $2::date
      WHERE id = $3 AND requester_user_id = $4
      `,
      [expertUserId, preferredDateRaw, requestId, auth.sub]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating participant trail request:', error);
    return NextResponse.json(
      { error: 'Failed to update trail request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;
    const deleted = await pool.query(
      `
      DELETE FROM trail_interest_requests
      WHERE id = $1 AND requester_user_id = $2
      RETURNING id
      `,
      [requestId, auth.sub]
    );

    if (deleted.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting participant trail request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel trail request' },
      { status: 500 }
    );
  }
}
