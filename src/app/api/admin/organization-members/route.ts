import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type OrgMemberRole = 'org_admin' | 'org_editor';
type OrgMemberStatus = 'active' | 'invited' | 'disabled';

function isValidRole(value: unknown): value is OrgMemberRole {
  return value === 'org_admin' || value === 'org_editor';
}

function isValidStatus(value: unknown): value is OrgMemberStatus {
  return value === 'active' || value === 'invited' || value === 'disabled';
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = (request.nextUrl.searchParams.get('organization_id') || '').trim();
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        om.id,
        om.organization_id,
        om.user_id,
        om.role,
        om.status,
        om.created_at,
        om.updated_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        o.name AS organization_name,
        o.slug AS organization_slug
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.organization_id = $1
      ORDER BY
        CASE om.role WHEN 'org_admin' THEN 1 ELSE 2 END,
        om.created_at DESC
      `,
      [organizationId]
    );

    return NextResponse.json({ members: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization members' },
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
      user_id?: string;
      role?: OrgMemberRole;
      status?: OrgMemberStatus;
    };

    const organizationId = (body.organization_id || '').trim();
    const userId = (body.user_id || '').trim();
    const role = body.role;
    const status = body.status ?? 'active';

    if (!organizationId || !userId || !isValidRole(role) || !isValidStatus(status)) {
      return NextResponse.json(
        {
          error:
            'organization_id, user_id, role(org_admin|org_editor), and valid status are required',
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (organization_id, user_id)
      DO UPDATE
      SET role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = NOW()
      RETURNING *
      `,
      [organizationId, userId, role, status]
    );

    return NextResponse.json({ member: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error upserting organization member:', error);
    return NextResponse.json(
      { error: 'Failed to save organization member' },
      { status: 500 }
    );
  }
}
