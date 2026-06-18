import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendPushToUserIds } from '@/lib/push';

const VALID_STATUSES = new Set(['pending', 'accepted', 'declined', 'completed', 'cancelled']);

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.program_id,
        r.expert_user_id,
        r.trail_id,
        r.requester_user_id,
        r.requester_name,
        r.requester_email,
        r.requester_phone,
        to_char(r.preferred_date::date, 'YYYY-MM-DD') AS preferred_date,
        r.preferred_time,
        r.group_size,
        r.offered_price_npr,
        r.notes,
        r.expert_response_note,
        r.status,
        r.created_at,
        r.updated_at,
        p.title AS program_title,
        p.max_group_size,
        p.price_npr,
        p.availability_weekdays AS program_availability_weekdays,
        p.available_time_note,
        t.name AS trail_name,
        t.slug AS trail_slug,
        t.location AS trail_location,
        u.availability_weekdays AS expert_availability_weekdays
      FROM expert_ride_program_requests r
      JOIN expert_ride_programs p ON p.id = r.program_id
      JOIN trails t ON t.id = r.trail_id
      JOIN users u ON u.id = r.expert_user_id
      WHERE r.expert_user_id = $1
      ORDER BY
        CASE r.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END,
        r.created_at DESC
      LIMIT 100
      `,
      [auth.sub]
    );

    return NextResponse.json({ requests: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expert ride program requests:', error);
    return NextResponse.json({ error: 'Failed to fetch ride program requests' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const requestId = String(body?.id || '').trim();
    const status = String(body?.status || '').trim();
    const expertResponseNote = String(body?.expert_response_note || '').trim();

    if (!requestId) {
      return NextResponse.json({ error: 'Request id is required.' }, { status: 400 });
    }
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid request status.' }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE expert_ride_program_requests
      SET status = $3, expert_response_note = $4, updated_at = NOW()
      WHERE id = $1 AND expert_user_id = $2
      RETURNING id, requester_user_id, requester_name, status, expert_response_note
      `,
      [requestId, auth.sub, status, expertResponseNote || null]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ride program request not found.' }, { status: 404 });
    }

    const updatedRequest = result.rows[0];
    if (updatedRequest.requester_user_id) {
      const programResult = await pool.query(
        `
        SELECT p.title
        FROM expert_ride_program_requests r
        JOIN expert_ride_programs p ON p.id = r.program_id
        WHERE r.id = $1
        LIMIT 1
        `,
        [requestId]
      );
      const programTitle = programResult.rows[0]?.title || 'your ride request';
      const statusCopy: Record<string, string> = {
        accepted: 'accepted',
        declined: 'declined',
        completed: 'marked completed',
        cancelled: 'cancelled',
        pending: 'moved back to pending',
      };
      const noteSuffix = updatedRequest.expert_response_note
        ? ` Note: ${updatedRequest.expert_response_note}`
        : '';
      await sendPushToUserIds([updatedRequest.requester_user_id], {
        title: 'Ride request updated',
        body: `${programTitle} was ${statusCopy[status] || status}.${noteSuffix}`,
        url: '/participants/me',
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating expert ride program request:', error);
    return NextResponse.json({ error: 'Failed to update ride program request' }, { status: 500 });
  }
}
