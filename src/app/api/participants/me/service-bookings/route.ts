import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await pool.query(
      `
      SELECT b.id, b.service_id,
             to_char(b.preferred_date, 'YYYY-MM-DD') AS preferred_date,
             to_char(b.preferred_time, 'HH24:MI') AS preferred_time,
             b.group_size, b.quoted_price_npr::text, b.notes,
             b.organization_response_note, b.status, b.created_at,
             s.title AS service_title, o.name AS organization_name, o.slug AS organization_slug
      FROM organization_service_bookings b
      JOIN organization_services s ON s.id = b.service_id
      JOIN organizations o ON o.id = b.organization_id
      WHERE b.participant_user_id = $1
      ORDER BY b.created_at DESC
      LIMIT 100
      `,
      [auth.sub]
    );
    return NextResponse.json({ bookings: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching participant service bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch service bookings.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const bookingId = String(body?.booking_id || '').trim();
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking id is required.' }, { status: 400 });
    }
    const result = await pool.query(
      `
      UPDATE organization_service_bookings
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND participant_user_id = $2 AND status IN ('pending', 'accepted')
      RETURNING id
      `,
      [bookingId, auth.sub]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Active booking request not found.' }, { status: 404 });
    }
    return NextResponse.json({ cancelled: true }, { status: 200 });
  } catch (error) {
    console.error('Error cancelling participant service booking:', error);
    return NextResponse.json({ error: 'Failed to cancel service booking.' }, { status: 500 });
  }
}
