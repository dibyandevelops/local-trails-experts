import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type RouteContext = { params: Promise<{ serviceId: string }> };

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const selected = new Date(`${value}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(selected.getTime()) && selected >= today;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json({ error: 'Participant account required.' }, { status: 401 });
    }

    const { serviceId } = await context.params;
    const body = await request.json();
    const preferredDate = String(body?.preferred_date || '').trim();
    const preferredTime = String(body?.preferred_time || '').trim() || null;
    const requesterPhone = String(body?.requester_phone || '').trim() || null;
    const notes = String(body?.notes || '').trim() || null;
    const groupSize = Number(body?.group_size || 1);

    if (!isValidDate(preferredDate)) {
      return NextResponse.json({ error: 'Choose a valid future date.' }, { status: 400 });
    }
    if (preferredTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) {
      return NextResponse.json({ error: 'Choose a valid preferred time.' }, { status: 400 });
    }
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 50) {
      return NextResponse.json({ error: 'Group size must be between 1 and 50.' }, { status: 400 });
    }
    if ((notes?.length || 0) > 2000) {
      return NextResponse.json({ error: 'Notes must be 2,000 characters or fewer.' }, { status: 400 });
    }

    const serviceResult = await pool.query(
      `
      SELECT s.id, s.organization_id, s.price_npr, s.title,
             o.name AS organization_name
      FROM organization_services s
      JOIN organizations o ON o.id = s.organization_id
      WHERE s.id = $1 AND s.is_active = TRUE AND o.is_active = TRUE AND o.is_verified = TRUE
      LIMIT 1
      `,
      [serviceId]
    );
    if (!serviceResult.rows.length) {
      return NextResponse.json({ error: 'Service is not available.' }, { status: 404 });
    }

    const userResult = await pool.query(
      `SELECT name, email, phone FROM users WHERE id = $1 AND role = 'participant' LIMIT 1`,
      [auth.sub]
    );
    const user = userResult.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Participant account not found.' }, { status: 404 });
    }

    const service = serviceResult.rows[0];
    const result = await pool.query(
      `
      INSERT INTO organization_service_bookings (
        service_id, organization_id, participant_user_id,
        requester_name, requester_email, requester_phone,
        preferred_date, preferred_time, group_size, quoted_price_npr, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::time, $9, $10, $11)
      RETURNING id, status, created_at
      `,
      [
        service.id,
        service.organization_id,
        auth.sub,
        user.name,
        user.email,
        requesterPhone || user.phone || null,
        preferredDate,
        preferredTime,
        groupSize,
        service.price_npr,
        notes,
      ]
    );

    return NextResponse.json(
      {
        booking: result.rows[0],
        service: { title: service.title, organization_name: service.organization_name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating service booking:', error);
    return NextResponse.json({ error: 'Failed to request service booking.' }, { status: 500 });
  }
}
