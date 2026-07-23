import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function requireAdmin(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  return auth?.role === 'admin' ? auth : null;
}

async function getPayments() {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.organization_id,
      o.name AS organization_name,
      o.slug AS organization_slug,
      p.amount_npr::text,
      p.months,
      p.transaction_reference,
      p.proof_image_url,
      p.status,
      p.admin_note,
      p.reviewed_at::text,
      p.created_at::text,
      submitter.name AS submitted_by_name,
      submitter.email AS submitted_by_email,
      reviewer.name AS reviewed_by_name
    FROM organization_subscription_payments p
    JOIN organizations o ON o.id = p.organization_id
    LEFT JOIN users submitter ON submitter.id = p.submitted_by_user_id
    LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by_admin_id
    ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at DESC
    LIMIT 200
    `
  );
  return result.rows;
}

export async function GET(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ payments: await getPayments() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching organization subscription payments:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription payments.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const client = await pool.connect();
  try {
    const auth = requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const paymentId = String(body.id || '').trim();
    const status = String(body.status || '').trim();
    const adminNote = String(body.admin_note || '').trim() || null;
    if (!paymentId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Payment id and valid status are required.' }, { status: 400 });
    }

    await client.query('BEGIN');
    const paymentResult = await client.query(
      `
      SELECT id, organization_id, months, status
      FROM organization_subscription_payments
      WHERE id = $1
      FOR UPDATE
      `,
      [paymentId]
    );
    const payment = paymentResult.rows[0] as
      | { id: string; organization_id: string; months: number; status: string }
      | undefined;
    if (!payment) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Subscription payment not found.' }, { status: 404 });
    }
    if (payment.status !== 'pending') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'This payment has already been reviewed.' }, { status: 409 });
    }

    await client.query(
      `
      UPDATE organization_subscription_payments
      SET status = $2,
          admin_note = $3,
          reviewed_by_admin_id = $4,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [payment.id, status, adminNote, auth.sub]
    );

    if (status === 'approved') {
      await client.query(
        `
        UPDATE organizations
        SET is_verified = TRUE,
            subscription_status = 'active',
            subscription_plan = CASE WHEN subscription_plan = 'free' THEN 'starter' ELSE subscription_plan END,
            subscription_expires_at =
              GREATEST(COALESCE(subscription_expires_at, NOW()), NOW())
              + ($2::int * INTERVAL '1 month'),
            updated_at = NOW()
        WHERE id = $1
        `,
        [payment.organization_id, payment.months]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ payments: await getPayments() });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error reviewing organization subscription payment:', error);
    return NextResponse.json({ error: 'Failed to review subscription payment.' }, { status: 500 });
  } finally {
    client.release();
  }
}
