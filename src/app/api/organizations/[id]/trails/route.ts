import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization } from '@/lib/organization-access';

type RelationType = 'built_by' | 'verified_by' | 'maintained_by';

function isValidRelationType(value: unknown): value is RelationType {
  return value === 'built_by' || value === 'verified_by' || value === 'maintained_by';
}

async function requireOrganizationAdmin(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canAdministerOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getOrganizationTrails(organizationId: string) {
  const result = await pool.query(
    `
    SELECT
      to2.id AS relation_id,
      to2.organization_id,
      to2.relation_type,
      to2.is_primary,
      t.id,
      t.slug,
      t.name,
      t.location,
      t.difficulty,
      t.sport_type,
      t.image_url
    FROM trail_organizations to2
    JOIN trails t ON t.id = to2.trail_id
    WHERE to2.organization_id = $1
      AND t.status = 'approved'
      AND COALESCE(t.is_hidden, FALSE) = FALSE
    ORDER BY to2.created_at DESC
    `,
    [organizationId]
  );
  return result.rows;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    return NextResponse.json({ trails: await getOrganizationTrails(id) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization trails:', error);
    return NextResponse.json({ error: 'Failed to fetch organization trails.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const trailId = String(body?.trail_id || '').trim();
    const relationType = body?.relation_type;
    if (!trailId || !isValidRelationType(relationType)) {
      return NextResponse.json(
        { error: 'Trail and relation type are required.' },
        { status: 400 }
      );
    }

    const trail = await pool.query(
      `SELECT id FROM trails WHERE id = $1 AND status = 'approved' AND COALESCE(is_hidden, FALSE) = FALSE LIMIT 1`,
      [trailId]
    );
    if (!trail.rows.length) {
      return NextResponse.json({ error: 'Trail not found or not approved.' }, { status: 404 });
    }

    const inserted = await pool.query(
      `
      INSERT INTO trail_organizations (trail_id, organization_id, relation_type, is_primary)
      VALUES ($1, $2, $3, FALSE)
      ON CONFLICT (trail_id, organization_id, relation_type)
      DO NOTHING
      RETURNING id
      `,
      [trailId, id, relationType]
    );
    if (!inserted.rows.length) {
      return NextResponse.json(
        { error: 'This organization already has that relationship with the selected trail.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ trails: await getOrganizationTrails(id) }, { status: 201 });
  } catch (error) {
    console.error('Error associating organization trail:', error);
    return NextResponse.json({ error: 'Failed to associate trail.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const relationId = String(body?.relation_id || '').trim();
    if (!relationId) {
      return NextResponse.json({ error: 'Relation id is required.' }, { status: 400 });
    }

    const deleted = await pool.query(
      `DELETE FROM trail_organizations WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [relationId, id]
    );
    if (!deleted.rows.length) {
      return NextResponse.json({ error: 'Trail relation not found.' }, { status: 404 });
    }

    return NextResponse.json({ trails: await getOrganizationTrails(id) }, { status: 200 });
  } catch (error) {
    console.error('Error removing organization trail:', error);
    return NextResponse.json({ error: 'Failed to remove trail relation.' }, { status: 500 });
  }
}
