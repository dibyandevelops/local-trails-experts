import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'participant') {
      return NextResponse.json(
        { error: 'Only participants can request this trail.' },
        { status: 401 }
      );
    }

    const trailId = params.id;
    const body = await request.json();
    const description = String(body?.description || '').trim();

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

    await pool.query(
      `
      INSERT INTO trail_interest_requests (
        trail_id, requester_user_id, requester_name, requester_email, description
      ) VALUES ($1, $2, $3, $4, $5)
      `,
      [trailId, auth.sub, user.name || null, user.email, description || null]
    );

    const recipientsRes = await pool.query(
      `
      SELECT email
      FROM users
      WHERE role IN ('admin', 'expert') AND email IS NOT NULL
      `
    );
    const recipients: string[] = recipientsRes.rows
      .map((row) => row.email)
      .filter(Boolean);

    await Promise.all(
      recipients.map((to) =>
        sendEmailSafe({
          to,
          subject: `Trail request: ${trail.name}`,
          text: `A participant requested activity on this trail.\n\nTrail: ${trail.name}\nSport: ${trail.sport_type || 'N/A'}\nLocation: ${trail.location || 'N/A'}\nRequested by: ${user.name || 'Participant'} (${user.email})\n\nDescription:\n${description || 'No additional details.'}`,
          html: `<p>A participant requested activity on this trail.</p><p><strong>Trail:</strong> ${trail.name}<br/><strong>Sport:</strong> ${trail.sport_type || 'N/A'}<br/><strong>Location:</strong> ${trail.location || 'N/A'}</p><p><strong>Requested by:</strong> ${user.name || 'Participant'} (${user.email})</p><p><strong>Description:</strong><br/>${description || 'No additional details.'}</p>`,
        })
      )
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error requesting trail:', error);
    return NextResponse.json(
      { error: 'Failed to submit trail request' },
      { status: 500 }
    );
  }
}
