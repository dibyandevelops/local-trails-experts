import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildLookup(idOrSlug: string) {
  if (UUID_V4_REGEX.test(idOrSlug)) {
    return { clause: 'o.id = $1', value: idOrSlug };
  }
  return { clause: 'o.slug = $1', value: idOrSlug.toLowerCase() };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { clause, value } = buildLookup(id);

    const result = await pool.query(
      `
      SELECT
        o.*,
        COUNT(DISTINCT om.user_id)::int AS member_count,
        COUNT(DISTINCT to2.trail_id)::int AS trail_count
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
      LEFT JOIN trail_organizations to2 ON to2.organization_id = o.id
      WHERE ${clause}
      GROUP BY o.id
      LIMIT 1
      `,
      [value]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { clause, value } = buildLookup(id);
    const body = (await request.json()) as Record<string, unknown>;

    const allowedFields = [
      'slug',
      'name',
      'tagline',
      'description',
      'logo_url',
      'website_url',
      'instagram_url',
      'facebook_url',
      'whatsapp_url',
      'contact_email',
      'contact_phone',
      'city',
      'country',
      'is_verified',
      'is_active',
    ] as const;

    const updates: string[] = [];
    const values: unknown[] = [value];
    let idx = 2;

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const raw = body[field];
        if (field === 'slug' && typeof raw === 'string') {
          const slug = raw.trim().toLowerCase();
          if (!slug) {
            return NextResponse.json({ error: 'slug cannot be empty' }, { status: 400 });
          }
          updates.push(`${field} = $${idx}`);
          values.push(slug);
        } else if (field === 'name' && typeof raw === 'string') {
          const name = raw.trim();
          if (!name) {
            return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
          }
          updates.push(`${field} = $${idx}`);
          values.push(name);
        } else if (field === 'country' && typeof raw === 'string') {
          updates.push(`${field} = $${idx}`);
          values.push(raw.trim() || 'Nepal');
        } else if (
          typeof raw === 'string' &&
          [
            'tagline',
            'description',
            'logo_url',
            'website_url',
            'instagram_url',
            'facebook_url',
            'whatsapp_url',
            'contact_email',
            'contact_phone',
            'city',
          ].includes(field)
        ) {
          updates.push(`${field} = $${idx}`);
          values.push(raw.trim() || null);
        } else {
          updates.push(`${field} = $${idx}`);
          values.push(raw);
        }
        idx += 1;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);

    const result = await pool.query(
      `
      UPDATE organizations o
      SET ${updates.join(', ')}
      WHERE ${clause.replace('o.', '')}
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization: result.rows[0] }, { status: 200 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      );
    }
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { clause, value } = buildLookup(id);

    const result = await pool.query(
      `
      DELETE FROM organizations o
      WHERE ${clause}
      RETURNING o.id, o.name
      `,
      [value]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
