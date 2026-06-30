import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendPushToUserIds } from '@/lib/push';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Please login to request this ride.' }, { status: 401 });
    }
    if (auth.role !== 'participant') {
      return NextResponse.json({ error: 'Ride requests are available for participants only.' }, { status: 403 });
    }

    const { id: programId } = await params;
    const body = await request.json();
    const preferredDateRaw = String(body?.preferred_date || '').trim();
    const preferredTime = String(body?.preferred_time || '').trim();
    const notes = String(body?.notes || '').trim();
    const requesterPhone = String(body?.requester_phone || '').trim();
    const groupSize = Math.max(1, Math.min(50, Number(body?.group_size || 1)));
    const offeredRaw = body?.offered_price_npr;
    const offeredPriceNpr =
      offeredRaw === null || offeredRaw === undefined || String(offeredRaw).trim() === ''
        ? null
        : Number(offeredRaw);

    if (!preferredDateRaw) {
      return NextResponse.json({ error: 'Please select a preferred date.' }, { status: 400 });
    }
    const preferredDateOnly = preferredDateRaw.slice(0, 10);
    const preferredDate = new Date(`${preferredDateOnly}T12:00:00`);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json({ error: 'Invalid preferred date.' }, { status: 400 });
    }
    if (preferredDateOnly < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'Preferred date cannot be in the past.' }, { status: 400 });
    }
    if (offeredPriceNpr !== null && (!Number.isFinite(offeredPriceNpr) || offeredPriceNpr < 0)) {
      return NextResponse.json({ error: 'Offered price must be zero or greater.' }, { status: 400 });
    }

    const programResult = await pool.query(
      `
      SELECT
        p.id,
        p.expert_user_id,
        p.organization_id,
        p.trail_id,
        p.title,
        p.max_group_size,
        p.availability_weekdays AS program_availability_weekdays,
        p.available_time_note,
        u.availability_weekdays,
        u.name AS expert_name,
        t.name AS trail_name
      FROM expert_ride_programs p
      JOIN users u ON u.id = p.expert_user_id
      JOIN trails t ON t.id = p.trail_id
      WHERE p.id = $1
        AND p.is_active = TRUE
        AND u.role = 'expert'
        AND u.is_verified_expert = TRUE
        AND COALESCE(u.is_hidden, FALSE) = FALSE
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      LIMIT 1
      `,
      [programId]
    );
    const program = programResult.rows[0];
    if (!program) {
      return NextResponse.json({ error: 'Ride program not found.' }, { status: 404 });
    }
    if (groupSize > Number(program.max_group_size || 1)) {
      return NextResponse.json({ error: `Group size cannot exceed ${program.max_group_size}.` }, { status: 400 });
    }

    const programWeekdays = Array.isArray(program.program_availability_weekdays)
      ? program.program_availability_weekdays
      : [];
    const expertWeekdays = Array.isArray(program.availability_weekdays)
      ? program.availability_weekdays
      : [];
    const availableWeekdays = programWeekdays.length > 0 ? programWeekdays : expertWeekdays;
    const requestedWeekday = WEEKDAYS[preferredDate.getDay()];
    if (availableWeekdays.length > 0 && !availableWeekdays.includes(requestedWeekday)) {
      return NextResponse.json(
        { error: `${program.expert_name || 'This expert'} is not marked available on ${requestedWeekday}.` },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      'SELECT id, name, email, phone FROM users WHERE id = $1 LIMIT 1',
      [auth.sub]
    );
    const user = userResult.rows[0];
    if (!user?.email) {
      return NextResponse.json({ error: 'Requester email not found.' }, { status: 400 });
    }

    const existingRequestResult = await pool.query(
      `
      SELECT id
      FROM expert_ride_program_requests
      WHERE requester_user_id = $1
        AND program_id = $2
        AND status IN ('pending', 'accepted')
      LIMIT 1
      `,
      [auth.sub, programId]
    );

    if (existingRequestResult.rows.length > 0) {
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
          updated_at = NOW()
        WHERE id = $1 AND requester_user_id = $2
        `,
        [
          existingRequestResult.rows[0].id,
          auth.sub,
          preferredDateOnly,
          preferredTime || null,
          requesterPhone || user.phone || null,
          groupSize,
          offeredPriceNpr,
          notes || null,
        ]
      );

      await sendPushToUserIds([program.expert_user_id], {
        title: 'Ride program request updated',
        body: `${user.name || 'A participant'} updated ${program.title}.`,
        url: '/experts/me',
      });
      if (program.organization_id) {
        const operators = await pool.query(
          `SELECT user_id FROM organization_members WHERE organization_id = $1 AND status = 'active'`,
          [program.organization_id]
        );
        await sendPushToUserIds(
          operators.rows.map((row) => row.user_id).filter((id) => id !== program.expert_user_id),
          {
            title: 'Program request updated',
            body: `${user.name || 'A participant'} updated ${program.title}.`,
            url: '/organizations/me',
          }
        );
      }

      return NextResponse.json({ success: true, updated: true }, { status: 200 });
    }

    await pool.query(
      `
      INSERT INTO expert_ride_program_requests (
        program_id,
        expert_user_id,
        trail_id,
        requester_user_id,
        requester_name,
        requester_email,
        requester_phone,
        preferred_date,
        preferred_time,
        group_size,
        offered_price_npr,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12)
      `,
      [
        program.id,
        program.expert_user_id,
        program.trail_id,
        auth.sub,
        user.name || null,
        user.email,
        requesterPhone || user.phone || null,
        preferredDateOnly,
        preferredTime || null,
        groupSize,
        offeredPriceNpr,
        notes || null,
      ]
    );

    await sendPushToUserIds([program.expert_user_id], {
      title: 'New ride program request',
      body: `${user.name || 'A participant'} requested ${program.title}.`,
      url: '/experts/me',
    });
    if (program.organization_id) {
      const operators = await pool.query(
        `SELECT user_id FROM organization_members WHERE organization_id = $1 AND status = 'active'`,
        [program.organization_id]
      );
      await sendPushToUserIds(
        operators.rows.map((row) => row.user_id).filter((id) => id !== program.expert_user_id),
        {
          title: 'New organization program request',
          body: `${user.name || 'A participant'} requested ${program.title}.`,
          url: '/organizations/me',
        }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error requesting expert ride program:', error);
    return NextResponse.json({ error: 'Failed to submit ride request' }, { status: 500 });
  }
}
