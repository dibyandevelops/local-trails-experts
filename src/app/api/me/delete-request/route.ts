import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { sendEmailSafe } from '@/lib/email';
import { buildBrandedEmail, getAppUrl } from '@/lib/email-templates';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT id, status, reason, created_at, reviewed_at
      FROM account_deletion_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [auth.sub]
    );

    return NextResponse.json({ request: result.rows[0] || null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching account deletion request:', error);
    return NextResponse.json({ error: 'Failed to fetch deletion request' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1',
      [auth.sub]
    );
    const user = userResult.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pendingResult = await pool.query(
      `
      SELECT id
      FROM account_deletion_requests
      WHERE user_id = $1 AND status = 'pending'
      LIMIT 1
      `,
      [auth.sub]
    );
    if (pendingResult.rows[0]) {
      return NextResponse.json(
        { error: 'A deletion request is already pending.' },
        { status: 409 }
      );
    }

    const insertResult = await pool.query(
      `
      INSERT INTO account_deletion_requests (user_id, email, role, reason, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING id, status, reason, created_at
      `,
      [auth.sub, user.email, user.role, reason || null]
    );

    const appUrl = getAppUrl();
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim();
    if (adminEmail) {
      const adminPayload = buildBrandedEmail({
        subject: `Account deletion request: ${user.email}`,
        appUrl,
        headline: 'Account deletion request received',
        subhead: `${user.name || user.email} (${user.role})`,
        bodyHtml: `A user requested account deletion.<br/><br/><strong>Email:</strong> ${user.email}<br/><strong>Role:</strong> ${user.role}<br/><strong>Reason:</strong> ${reason || 'Not provided'}<br/><br/>Review in admin console.`,
        bodyText: `Account deletion request\nEmail: ${user.email}\nRole: ${user.role}\nReason: ${reason || 'Not provided'}`,
      });
      await sendEmailSafe({
        to: adminEmail,
        ...adminPayload,
        dedupeKey: `account-delete-request:admin:${auth.sub}:${insertResult.rows[0].id}`,
      });
    }

    const userPayload = buildBrandedEmail({
      subject: 'We received your account deletion request',
      appUrl,
      headline: 'Deletion request submitted',
      subhead: 'Our team will review your request.',
      greetingName: user.name || user.email,
      bodyHtml:
        'Your account deletion request is now pending review. You can continue using the account until it is approved and completed.',
      bodyText:
        'Your account deletion request is now pending review. You can continue using the account until it is approved and completed.',
    });
    await sendEmailSafe({
      to: user.email,
      ...userPayload,
      dedupeKey: `account-delete-request:user:${auth.sub}:${insertResult.rows[0].id}`,
    });

    return NextResponse.json({ request: insertResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating account deletion request:', error);
    return NextResponse.json({ error: 'Failed to submit deletion request' }, { status: 500 });
  }
}
