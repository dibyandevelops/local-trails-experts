import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';
import { sendPushToUserIds } from '@/lib/push';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Please login to request this trail.' },
        { status: 401 }
      );
    }

    const { id: trailId } = await params;
    const body = await request.json();
    const description = String(body?.description || '').trim();
    const expertUserId = String(body?.expert_user_id || '').trim();
    const preferredDateRaw = String(body?.preferred_date || '').trim();
    const preferredTime = String(body?.preferred_time || '').trim();
    const nearestPoint = String(body?.nearest_point || '').trim();
    const offeredPriceRaw = body?.offered_price_npr;
    const offeredPriceNpr =
      offeredPriceRaw === null || offeredPriceRaw === undefined || String(offeredPriceRaw).trim() === ''
        ? null
        : Number(offeredPriceRaw);

    if (!EXPERTS_BETA_ENABLED && !expertUserId) {
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
    if (offeredPriceNpr !== null && (!Number.isFinite(offeredPriceNpr) || offeredPriceNpr < 0)) {
      return NextResponse.json(
        { error: 'Offered price must be a valid number greater than or equal to 0.' },
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
    const preferredDateOnly = preferredDateRaw.slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (preferredDateOnly < today) {
      return NextResponse.json(
        { error: 'Preferred date cannot be in the past.' },
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

    let expert: { id: string; name: string | null; email: string | null } | null = null;
    if (!EXPERTS_BETA_ENABLED) {
      const expertRes = await pool.query(
        `
        SELECT id, name, email
        FROM users
        WHERE id = $1 AND role = 'expert' AND is_verified_expert = true
        LIMIT 1
        `,
        [expertUserId]
      );
      expert = expertRes.rows[0] || null;
      if (!expert?.email) {
        return NextResponse.json(
          { error: 'Selected expert is not available.' },
          { status: 400 }
        );
      }
    }

    const activeRequestRes = await pool.query(
      `
      SELECT id
      FROM trail_interest_requests
      WHERE requester_user_id = $1
        AND preferred_date = $2::date
      LIMIT 1
      `,
      [auth.sub, preferredDateOnly]
    );
    if (activeRequestRes.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            'You already have a trail request for this date. Cancel it or choose another date.',
        },
        { status: 409 }
      );
    }

    if (!EXPERTS_BETA_ENABLED && expertUserId) {
      const busyRes = await pool.query(
        `
        SELECT id, title, event_date
        FROM events
        WHERE host_user_id = $1
          AND DATE(event_date) = $2::date
        LIMIT 1
        `,
        [expertUserId, preferredDateOnly]
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
    }

    await pool.query(
      `
      INSERT INTO trail_interest_requests (
        trail_id, requester_user_id, requester_name, requester_email, description, assigned_expert_user_id, preferred_date, preferred_time, offered_price_npr, nearest_point
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10)
      `,
      [
        trailId,
        auth.sub,
        user.name || null,
        user.email,
        description || null,
        EXPERTS_BETA_ENABLED ? null : expertUserId,
        preferredDateOnly,
        preferredTime || null,
        offeredPriceNpr,
        nearestPoint || null,
      ]
    );

    const adminRows = await pool.query(
      `SELECT id, email FROM users WHERE role = 'admin' AND email IS NOT NULL`
    );
    const adminEmails = Array.from(
      new Set(
        adminRows.rows
          .map((row) => String(row.email || '').trim())
          .filter(Boolean)
      )
    );
    const adminUserIds = adminRows.rows.map((row) => String(row.id));
    const uniqueRecipients = Array.from(
      new Set(
        (EXPERTS_BETA_ENABLED ? adminEmails : [expert?.email, ...adminEmails]).filter(
          Boolean
        ) as string[]
      )
    );

    const requestEmail = buildBrandedEmail({
      subject: `Trail request: ${trail.name}`,
      appUrl: getAppUrl(),
      headline: 'New trail request',
      subhead: trail.name,
      bodyHtml: `A participant requested activity on this trail.<br/><br/><strong>Trail:</strong> ${trail.name}<br/><strong>Sport:</strong> ${trail.sport_type || 'N/A'}<br/><strong>Location:</strong> ${trail.location || 'N/A'}<br/><strong>Preferred date:</strong> ${preferredDateOnly}<br/><strong>Preferred time:</strong> ${preferredTime || 'N/A'}<br/><strong>Nearest point:</strong> ${nearestPoint || 'N/A'}<br/><strong>Offered price (NPR):</strong> ${offeredPriceNpr ?? 'N/A'}<br/><strong>Preferred expert:</strong> ${EXPERTS_BETA_ENABLED ? 'Admin assigned (Experts Beta)' : expert?.name || expert?.email || 'N/A'}<br/><strong>Requested by:</strong> ${user.name || 'Participant'} (${user.email})<br/><strong>Description:</strong> ${description || 'No additional details.'}`,
      bodyText: `A participant requested activity on this trail.\n\nTrail: ${trail.name}\nSport: ${trail.sport_type || 'N/A'}\nLocation: ${trail.location || 'N/A'}\nPreferred date: ${preferredDateOnly}\nPreferred time: ${preferredTime || 'N/A'}\nNearest point: ${nearestPoint || 'N/A'}\nOffered price (NPR): ${offeredPriceNpr ?? 'N/A'}\nPreferred expert: ${EXPERTS_BETA_ENABLED ? 'Admin assigned (Experts Beta)' : expert?.name || expert?.email || 'N/A'}\nRequested by: ${user.name || 'Participant'} (${user.email})\n\nDescription:\n${description || 'No additional details.'}`,
    });

    const recipientKey = EXPERTS_BETA_ENABLED ? 'admin' : expertUserId;
    const dedupeKey = `trail-request:${trailId}:${preferredDateOnly}:${recipientKey}:${auth.sub}`;
    await Promise.all(
      uniqueRecipients.map((to) =>
        sendEmailSafe({
          to,
          ...requestEmail,
          dedupeKey,
        })
      )
    );

    const pushRecipients = EXPERTS_BETA_ENABLED
      ? adminUserIds
      : Array.from(new Set([expertUserId, ...adminUserIds].filter(Boolean)));
    await sendPushToUserIds(pushRecipients, {
      title: 'New trail request',
      body: `${user.name || 'Participant'} requested ${trail.name}.`,
      url: EXPERTS_BETA_ENABLED ? '/admin' : '/experts/me#trail-requests',
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
