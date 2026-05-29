import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type ServiceType = 'shuttle' | 'lift' | 'support_vehicle';

function isValidServiceType(value: unknown): value is ServiceType {
  return value === 'shuttle' || value === 'lift' || value === 'support_vehicle';
}

async function validateTrailOrganizationLink(
  trailId: string,
  organizationId: string | null
): Promise<boolean> {
  if (!organizationId) return true;
  const result = await pool.query(
    `
    SELECT 1
    FROM trail_organizations
    JOIN organizations o ON o.id = trail_organizations.organization_id
    WHERE trail_organizations.trail_id = $1
      AND trail_organizations.organization_id = $2
      AND o.is_active = TRUE
    LIMIT 1
    `,
    [trailId, organizationId]
  );
  return result.rows.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trailId = (request.nextUrl.searchParams.get('trail_id') || '').trim();
    const organizationId = (request.nextUrl.searchParams.get('organization_id') || '').trim();
    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true';

    const where: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (trailId) {
      where.push(`ts.trail_id = $${idx}`);
      values.push(trailId);
      idx += 1;
    }
    if (organizationId) {
      where.push(`ts.organization_id = $${idx}`);
      values.push(organizationId);
      idx += 1;
    }
    if (!includeInactive) {
      where.push('ts.is_active = TRUE');
    }
    where.push('(ts.organization_id IS NULL OR o.is_active = TRUE)');

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        ts.id,
        ts.trail_id,
        t.name AS trail_name,
        ts.organization_id,
        o.name AS organization_name,
        ts.service_type,
        ts.title,
        ts.description,
        ts.contact_phone,
        ts.contact_whatsapp,
        ts.contact_email,
        ts.price_note,
        ts.schedule_note,
        ts.is_active,
        ts.created_at::text,
        ts.updated_at::text
      FROM trail_services ts
      LEFT JOIN trails t ON t.id = ts.trail_id
      LEFT JOIN organizations o ON o.id = ts.organization_id
      ${whereClause}
      ORDER BY ts.updated_at DESC
      `,
      values
    );

    return NextResponse.json({ services: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin trail services:', error);
    return NextResponse.json({ error: 'Failed to fetch trail services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      trail_id?: string;
      organization_id?: string | null;
      service_type?: ServiceType;
      title?: string;
      description?: string | null;
      contact_phone?: string | null;
      contact_whatsapp?: string | null;
      contact_email?: string | null;
      price_note?: string | null;
      schedule_note?: string | null;
      is_active?: boolean;
    };

    const trailId = (body.trail_id || '').trim();
    const title = (body.title || '').trim();
    if (!trailId || !title || !isValidServiceType(body.service_type)) {
      return NextResponse.json(
        { error: 'trail_id, title, and valid service_type are required' },
        { status: 400 }
      );
    }
    const trailCheck = await pool.query(`SELECT 1 FROM trails WHERE id = $1 LIMIT 1`, [trailId]);
    if (!trailCheck.rows.length) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }
    const linked = await validateTrailOrganizationLink(trailId, body.organization_id || null);
    if (!linked) {
      return NextResponse.json(
        { error: 'organization_id must be linked to the trail' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO trail_services (
        trail_id,
        organization_id,
        service_type,
        title,
        description,
        contact_phone,
        contact_whatsapp,
        contact_email,
        price_note,
        schedule_note,
        is_active,
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        trailId,
        body.organization_id || null,
        body.service_type,
        title,
        body.description?.trim() || null,
        body.contact_phone?.trim() || null,
        body.contact_whatsapp?.trim() || null,
        body.contact_email?.trim() || null,
        body.price_note?.trim() || null,
        body.schedule_note?.trim() || null,
        body.is_active ?? true,
        auth.sub,
      ]
    );

    return NextResponse.json({ service: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating trail service:', error);
    return NextResponse.json({ error: 'Failed to create trail service' }, { status: 500 });
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

    const fieldNames = [
      'trail_id',
      'organization_id',
      'service_type',
      'title',
      'description',
      'contact_phone',
      'contact_whatsapp',
      'contact_email',
      'price_note',
      'schedule_note',
      'is_active',
    ] as const;

    const updates: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    const existing = await pool.query(
      `
      SELECT trail_id, organization_id
      FROM trail_services
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );
    if (!existing.rows.length) {
      return NextResponse.json({ error: 'Trail service not found' }, { status: 404 });
    }
    const current = existing.rows[0] as { trail_id: string; organization_id: string | null };

    for (const fieldName of fieldNames) {
      if (Object.prototype.hasOwnProperty.call(body, fieldName)) {
        if (fieldName === 'service_type' && !isValidServiceType(body[fieldName])) {
          return NextResponse.json({ error: 'Invalid service_type' }, { status: 400 });
        }
        updates.push(`${fieldName} = $${idx}`);
        values.push(body[fieldName] ?? null);
        idx += 1;
      }
    }

    const effectiveTrailId = Object.prototype.hasOwnProperty.call(body, 'trail_id')
      ? String(body.trail_id || '').trim()
      : current.trail_id;
    if (!effectiveTrailId) {
      return NextResponse.json({ error: 'trail_id is required' }, { status: 400 });
    }
    const effectiveOrgId = Object.prototype.hasOwnProperty.call(body, 'organization_id')
      ? (body.organization_id ? String(body.organization_id).trim() : null)
      : current.organization_id;
    const linked = await validateTrailOrganizationLink(effectiveTrailId, effectiveOrgId);
    if (!linked) {
      return NextResponse.json(
        { error: 'organization_id must be linked to the trail' },
        { status: 400 }
      );
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    updates.push('updated_at = NOW()');

    const result = await pool.query(
      `
      UPDATE trail_services
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
      `,
      values
    );

    return NextResponse.json({ service: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating trail service:', error);
    return NextResponse.json({ error: 'Failed to update trail service' }, { status: 500 });
  }
}
