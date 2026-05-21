import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused' | 'archived';

function isValidStatus(value: unknown): value is CampaignStatus {
  return (
    value === 'draft' ||
    value === 'active' ||
    value === 'completed' ||
    value === 'paused' ||
    value === 'archived'
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = (request.nextUrl.searchParams.get('organization_id') || '').trim();
    const status = (request.nextUrl.searchParams.get('status') || '').trim();

    const where: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (organizationId) {
      where.push(`fc.organization_id = $${idx}`);
      values.push(organizationId);
      idx += 1;
    }
    if (status && isValidStatus(status)) {
      where.push(`fc.status = $${idx}`);
      values.push(status);
      idx += 1;
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        fc.*,
        o.name AS organization_name,
        t.name AS trail_name
      FROM fundraising_campaigns fc
      LEFT JOIN organizations o ON o.id = fc.organization_id
      LEFT JOIN trails t ON t.id = fc.trail_id
      ${whereClause}
      ORDER BY fc.created_at DESC
      `,
      values
    );

    return NextResponse.json({ campaigns: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fundraising campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fundraising campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      organization_id?: string;
      trail_id?: string | null;
      title?: string;
      description?: string | null;
      target_amount_npr?: number;
      raised_amount_npr?: number;
      qr_image_url?: string | null;
      payment_note?: string | null;
      status?: CampaignStatus;
      starts_at?: string | null;
      ends_at?: string | null;
    };

    const organizationId = (body.organization_id || '').trim();
    const title = (body.title || '').trim();
    const targetAmount = Number(body.target_amount_npr || 0);
    const status = body.status || 'draft';
    if (!organizationId || !title || !Number.isFinite(targetAmount) || targetAmount <= 0 || !isValidStatus(status)) {
      return NextResponse.json(
        { error: 'organization_id, title, target_amount_npr (>0), and valid status are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO fundraising_campaigns (
        organization_id, trail_id, title, description, target_amount_npr, raised_amount_npr,
        qr_image_url, payment_note, status, starts_at, ends_at, created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        organizationId,
        body.trail_id || null,
        title,
        body.description?.trim() || null,
        targetAmount,
        Number.isFinite(Number(body.raised_amount_npr)) ? Number(body.raised_amount_npr) : 0,
        body.qr_image_url?.trim() || null,
        body.payment_note?.trim() || null,
        status,
        body.starts_at || null,
        body.ends_at || null,
        auth.sub,
      ]
    );

    return NextResponse.json({ campaign: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating fundraising campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create fundraising campaign' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const fields = [
      'organization_id',
      'trail_id',
      'title',
      'description',
      'target_amount_npr',
      'raised_amount_npr',
      'qr_image_url',
      'payment_note',
      'status',
      'starts_at',
      'ends_at',
    ] as const;

    const updates: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        if (field === 'status' && !isValidStatus(body[field])) {
          return NextResponse.json({ error: 'Invalid campaign status' }, { status: 400 });
        }
        if (
          field === 'target_amount_npr' &&
          (typeof body[field] !== 'number' || !Number.isFinite(body[field] as number) || (body[field] as number) <= 0)
        ) {
          return NextResponse.json(
            { error: 'target_amount_npr must be a number greater than 0' },
            { status: 400 }
          );
        }
        if (
          field === 'raised_amount_npr' &&
          (typeof body[field] !== 'number' || !Number.isFinite(body[field] as number) || (body[field] as number) < 0)
        ) {
          return NextResponse.json(
            { error: 'raised_amount_npr must be a number >= 0' },
            { status: 400 }
          );
        }
        updates.push(`${field} = $${idx}`);
        values.push(body[field] ?? null);
        idx += 1;
      }
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');

    const result = await pool.query(
      `
      UPDATE fundraising_campaigns
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
      `,
      values
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating fundraising campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update fundraising campaign' },
      { status: 500 }
    );
  }
}
