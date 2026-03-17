import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';
import { sendPushToUserIds } from '@/lib/push';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Please login to request this trail.' },
        { status: 401 }
      );
    }

    const trailId = params.id;
    const body = await request.json();
    const description = String(body?.description || '').trim();
    const expertUserId = String(body?.expert_user_id || '').trim();
    const preferredDateRaw = String(body?.preferred_date || '').trim();

    if (!expertUserId) {
      return NextResponse.json(
        { error: 'Please select an expert for this request.' },
        { status: 400 }
      );
    }
    if (!preferredDateRaw) {
      return NextResponse.json(
        { error: 'Please select a preferred date.' },
        { status: 400 }
      );
    }

    const preferredDate = new Date(preferredDateRaw);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid preferred date.' },
        { status: 400 }
      );
    }

    const trailRes = await pool.query(
      'SELECT id, name, sport_type, location FROM trails WHERE id = $1 LIMIT 1',
      [trailId]
    );
    const trail = trailRes.rows[0];
    if (!trail) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    const userRes = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1 LIMIT 1',
      [auth.sub]
    );
    const user = userRes.rows[0];
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Requester email not found' },
        { status: 400 }
      );
    }

    const expertRes = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE id = $1 AND role = 'expert' AND is_verified_expert = true
      LIMIT 1
      `,
      [expertUserId]
    );
    const expert = expertRes.rows[0];
    if (!expert?.email) {
      return NextResponse.json(
        { error: 'Selected expert is not available.' },
        { status: 400 }
      );
    }

    const busyRes = await pool.query(
      `
      SELECT id, title, event_date
      FROM events
      WHERE host_user_id = $1
        AND DATE(event_date) = $2::date
      LIMIT 1
      `,
      [expertUserId, preferredDateRaw]
    );
    if (busyRes.rows.length > 0) {
      const conflict = busyRes.rows[0];
      return NextResponse.json(
        {
          error: `Selected expert is busy on ${preferredDateRaw} (${conflict.title}). Please choose another date or expert.`,
        },
        { status: 409 }
      );
    }

    await pool.query(
      `
      INSERT INTO trail_interest_requests (
        trail_id, requester_user_id, requester_name, requester_email, description, assigned_expert_user_id, preferred_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date)
      `,
      [
        trailId,
        auth.sub,
        user.name || null,
        user.email,
        description || null,
        expertUserId,
        preferredDateRaw,
      ]
    );

    const uniqueRecipients = Array.from(new Set([expert.email]));

    const requestEmail = buildBrandedEmail({
      subject: `Trail request: ${trail.name}`,
      appUrl: getAppUrl(),
      headline: 'New trail request',
      subhead: trail.name,
      bodyHtml: `A participant requested activity on this trail.<br/><br/><strong>Trail:</strong> ${trail.name}<br/><strong>Sport:</strong> ${trail.sport_type || 'N/A'}<br/><strong>Location:</strong> ${trail.location || 'N/A'}<br/><strong>Preferred date:</strong> ${preferredDateRaw}<br/><strong>Preferred expert:</strong> ${expert.name || expert.email}<br/><strong>Requested by:</strong> ${user.name || 'Participant'} (${user.email})<br/><strong>Description:</strong> ${description || 'No additional details.'}`,
      bodyText: `A participant requested activity on this trail.\n\nTrail: ${trail.name}\nSport: ${trail.sport_type || 'N/A'}\nLocation: ${trail.location || 'N/A'}\nPreferred date: ${preferredDateRaw}\nPreferred expert: ${expert.name || expert.email}\nRequested by: ${user.name || 'Participant'} (${user.email})\n\nDescription:\n${description || 'No additional details.'}`,
    });

    const dedupeKey = `trail-request:${trailId}:${preferredDateRaw}:${expertUserId}:${auth.sub}`;
    await Promise.all(
      uniqueRecipients.map((to) =>
        sendEmailSafe({
          to,
          ...requestEmail,
          dedupeKey,
        })
      )
    );

    await sendPushToUserIds([expertUserId], {
      title: 'New trail request',
      body: `${user.name || 'Participant'} requested ${trail.name}.`,
      url: `/experts/me#trail-requests`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error requesting trail:', error);
    return NextResponse.json(
      { error: 'Failed to submit trail request' },
      { status: 500 }
    );
  }
}
