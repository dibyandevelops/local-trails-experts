import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getPreferredDate(value: string) {
  const preferredDateOnly = value.slice(0, 10);
  const preferredDate = new Date(`${preferredDateOnly}T12:00:00`);
  return { preferredDateOnly, preferredDate };
}

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
    const preferredDateRaw = String(body?.preferred_date || '').trim();
    const preferredTime = String(body?.preferred_time || '').trim();
    const requesterPhone = String(body?.requester_phone || '').trim();
    const notes = String(body?.notes || '').trim();
    const groupSize = Math.max(1, Math.min(50, Number(body?.group_size || 1)));
    const offeredRaw = body?.offered_price_npr;
    const offeredPriceNpr =
      offeredRaw === null || offeredRaw === undefined || String(offeredRaw).trim() === ''
        ? null
        : Number(offeredRaw);

    if (!preferredDateRaw) {
      return NextResponse.json({ error: 'Please select a preferred date.' }, { status: 400 });
    }

    const { preferredDateOnly, preferredDate } = getPreferredDate(preferredDateRaw);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json({ error: 'Invalid preferred date.' }, { status: 400 });
    }
    if (preferredDateOnly < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'Preferred date cannot be in the past.' }, { status: 400 });
    }
    if (offeredPriceNpr !== null && (!Number.isFinite(offeredPriceNpr) || offeredPriceNpr < 0)) {
      return NextResponse.json({ error: 'Offered price must be zero or greater.' }, { status: 400 });
    }

    const requestResult = await pool.query(
      `
      SELECT
        r.id,
        r.program_id,
        r.status,
        p.max_group_size,
        u.name AS expert_name,
        u.availability_weekdays
      FROM expert_ride_program_requests r
      JOIN expert_ride_programs p ON p.id = r.program_id
      JOIN users u ON u.id = r.expert_user_id
      WHERE r.id = $1 AND r.requester_user_id = $2
      LIMIT 1
      `,
      [requestId, auth.sub]
    );
    const existing = requestResult.rows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Ride request not found.' }, { status: 404 });
    }
    if (!['pending', 'accepted'].includes(existing.status)) {
      return NextResponse.json({ error: 'Only pending or accepted requests can be edited.' }, { status: 400 });
    }
    if (groupSize > Number(existing.max_group_size || 1)) {
      return NextResponse.json({ error: `Group size cannot exceed ${existing.max_group_size}.` }, { status: 400 });
    }

    const availableWeekdays = Array.isArray(existing.availability_weekdays)
      ? existing.availability_weekdays
      : [];
    const requestedWeekday = WEEKDAYS[preferredDate.getDay()];
    if (availableWeekdays.length > 0 && !availableWeekdays.includes(requestedWeekday)) {
      return NextResponse.json(
        { error: `${existing.expert_name || 'This expert'} is not marked available on ${requestedWeekday}.` },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE expert_ride_program_requests
      SET
        preferred_date = $3::date,
        preferred_time = $4,
        requester_phone = $5,
        group_size = $6,
        offered_price_npr = $7,
        notes = $8,
        status = CASE WHEN status = 'declined' THEN 'pending' ELSE status END,
        updated_at = NOW()
      WHERE id = $1 AND requester_user_id = $2
      `,
      [
        requestId,
        auth.sub,
        preferredDateOnly,
        preferredTime || null,
        requesterPhone || null,
        groupSize,
        offeredPriceNpr,
        notes || null,
      ]
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating ride program request:', error);
    return NextResponse.json({ error: 'Failed to update ride program request' }, { status: 500 });
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
    const result = await pool.query(
      `
      UPDATE expert_ride_program_requests
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND requester_user_id = $2 AND status IN ('pending', 'accepted')
      RETURNING id
      `,
      [requestId, auth.sub]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ride request not found or cannot be cancelled.' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error cancelling ride program request:', error);
    return NextResponse.json({ error: 'Failed to cancel ride program request' }, { status: 500 });
  }
}
