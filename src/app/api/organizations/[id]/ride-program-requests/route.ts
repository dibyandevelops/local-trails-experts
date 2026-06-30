import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canOperateOrganization } from '@/lib/organization-access';
import { sendPushToUserIds } from '@/lib/push';

const VALID_STATUSES = new Set(['pending', 'accepted', 'declined', 'completed', 'cancelled']);

async function requireOperator(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canOperateOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getRequests(organizationId: string) {
  const result = await pool.query(
    `
    SELECT
      r.*,
      to_char(r.preferred_date::date, 'YYYY-MM-DD') AS preferred_date,
      p.title AS program_title,
      u.name AS expert_name,
      t.name AS trail_name,
      t.slug AS trail_slug
    FROM expert_ride_program_requests r
    JOIN expert_ride_programs p ON p.id = r.program_id
    JOIN users u ON u.id = r.expert_user_id
    JOIN trails t ON t.id = r.trail_id
    WHERE p.organization_id = $1
    ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'accepted' THEN 1 ELSE 2 END, r.created_at DESC
    LIMIT 100
    `,
    [organizationId]
  );
  return result.rows;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOperator(request, id))) {
      return NextResponse.json({ error: 'Organization access required.' }, { status: 403 });
    }
    return NextResponse.json({ requests: await getRequests(id) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization program requests:', error);
    return NextResponse.json({ error: 'Failed to fetch program requests' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOperator(request, id))) {
      return NextResponse.json({ error: 'Organization access required.' }, { status: 403 });
    }
    const body = await request.json();
    const requestId = String(body?.request_id || '').trim();
    const status = String(body?.status || '').trim();
    const responseNote = String(body?.expert_response_note || '').trim();
    if (!requestId || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Request id and valid status are required.' }, { status: 400 });
    }
    const result = await pool.query(
      `
      UPDATE expert_ride_program_requests r
      SET status = $3, expert_response_note = $4, updated_at = NOW()
      FROM expert_ride_programs p
      WHERE r.id = $1 AND r.program_id = p.id AND p.organization_id = $2
      RETURNING r.requester_user_id, p.title
      `,
      [requestId, id, status, responseNote || null]
    );
    if (!result.rows.length) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    if (result.rows[0].requester_user_id) {
      await sendPushToUserIds([result.rows[0].requester_user_id], {
        title: 'Program request updated',
        body: `${result.rows[0].title} is now ${status}.${responseNote ? ` ${responseNote}` : ''}`,
        url: '/participants/me',
      });
    }
    return NextResponse.json({ requests: await getRequests(id) }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization program request:', error);
    return NextResponse.json({ error: 'Failed to update program request' }, { status: 500 });
  }
}
