import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type RelationType = 'built_by' | 'verified_by' | 'maintained_by';

function isValidRelationType(value: unknown): value is RelationType {
  return (
    value === 'built_by' ||
    value === 'verified_by' ||
    value === 'maintained_by'
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trailId = (request.nextUrl.searchParams.get('trail_id') || '').trim();
    const organizationId = (request.nextUrl.searchParams.get('organization_id') || '').trim();

    const where: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (trailId) {
      where.push(`to2.trail_id = $${idx}`);
      values.push(trailId);
      idx += 1;
    }
    if (organizationId) {
      where.push(`to2.organization_id = $${idx}`);
      values.push(organizationId);
      idx += 1;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `
      SELECT
        to2.id,
        to2.trail_id,
        to2.organization_id,
        to2.relation_type,
        to2.is_primary,
        to2.created_at,
        t.name AS trail_name,
        o.name AS organization_name,
        o.slug AS organization_slug
      FROM trail_organizations to2
      JOIN trails t ON t.id = to2.trail_id
      JOIN organizations o ON o.id = to2.organization_id
      ${whereClause}
      ORDER BY to2.created_at DESC
      `,
      values
    );

    return NextResponse.json({ assignments: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail organization assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trail organization assignments' },
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
      trail_id?: string;
      organization_id?: string;
      relation_type?: RelationType;
      is_primary?: boolean;
    };

    const trailId = (body.trail_id || '').trim();
    const organizationId = (body.organization_id || '').trim();
    const relationType = body.relation_type;
    const isPrimary = Boolean(body.is_primary);

    if (!trailId || !organizationId || !isValidRelationType(relationType)) {
      return NextResponse.json(
        {
          error:
            'trail_id, organization_id, and relation_type(built_by|verified_by|maintained_by) are required',
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (isPrimary) {
        await client.query(
          `
          UPDATE trail_organizations
          SET is_primary = FALSE
          WHERE trail_id = $1 AND relation_type = $2
          `,
          [trailId, relationType]
        );
      }

      const result = await client.query(
        `
        INSERT INTO trail_organizations (trail_id, organization_id, relation_type, is_primary)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (trail_id, organization_id, relation_type)
        DO UPDATE
        SET is_primary = EXCLUDED.is_primary
        RETURNING *
        `,
        [trailId, organizationId, relationType, isPrimary]
      );

      await client.query('COMMIT');
      return NextResponse.json({ assignment: result.rows[0] }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving trail organization assignment:', error);
    return NextResponse.json(
      { error: 'Failed to save trail organization assignment' },
      { status: 500 }
    );
  }
}
