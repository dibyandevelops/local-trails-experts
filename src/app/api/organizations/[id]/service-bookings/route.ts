import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canOperateOrganization } from '@/lib/organization-access';

async function requireOperator(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canOperateOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getBookings(organizationId: string) {
  const result = await pool.query(
    `
    SELECT b.id, b.service_id, b.requester_name, b.requester_email, b.requester_phone,
           to_char(b.preferred_date, 'YYYY-MM-DD') AS preferred_date,
           to_char(b.preferred_time, 'HH24:MI') AS preferred_time,
           b.group_size, b.quoted_price_npr::text, b.notes,
           b.organization_response_note, b.status, b.created_at,
           s.title AS service_title
    FROM organization_service_bookings b
    JOIN organization_services s ON s.id = b.service_id
    WHERE b.organization_id = $1
    ORDER BY CASE b.status WHEN 'pending' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END,
             b.created_at DESC
    LIMIT 200
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
    return NextResponse.json({ bookings: await getBookings(id) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization service bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch service bookings.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOperator(request, id))) {
      return NextResponse.json({ error: 'Organization access required.' }, { status: 403 });
    }
    const body = await request.json();
    const bookingId = String(body?.booking_id || '').trim();
    const status = String(body?.status || '').trim();
    const responseNote = String(body?.organization_response_note || '').trim() || null;
    if (!bookingId || !['accepted', 'declined', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Valid booking and status are required.' }, { status: 400 });
    }
    if ((responseNote?.length || 0) > 2000) {
      return NextResponse.json({ error: 'Response note must be 2,000 characters or fewer.' }, { status: 400 });
    }

    const result = await pool.query(
      `
      UPDATE organization_service_bookings
      SET status = $3, organization_response_note = $4, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
        AND status IN ('pending', 'accepted')
      RETURNING id
      `,
      [bookingId, id, status, responseNote]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Active booking request not found.' }, { status: 404 });
    }
    return NextResponse.json({ bookings: await getBookings(id) }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization service booking:', error);
    return NextResponse.json({ error: 'Failed to update service booking.' }, { status: 500 });
  }
}
