import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { canAdministerOrganization } from '@/lib/organization-access';

const VALID_ROLES = new Set(['org_admin', 'org_editor']);
const VALID_STATUSES = new Set(['active', 'invited', 'disabled']);

async function requireOrganizationAdmin(request: NextRequest, organizationId: string) {
  const auth = getAuthFromRequest(request);
  if (!auth || !(await canAdministerOrganization(auth.sub, organizationId))) return null;
  return auth;
}

async function getMembers(organizationId: string) {
  const result = await pool.query(
    `
    SELECT om.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = $1
    ORDER BY CASE om.role WHEN 'org_owner' THEN 1 WHEN 'org_admin' THEN 2 ELSE 3 END, om.created_at ASC
    `,
    [organizationId]
  );
  return result.rows;
}

async function hasAnotherActiveAdmin(organizationId: string, memberId: string) {
  const result = await pool.query(
    `
    SELECT 1 FROM organization_members
    WHERE organization_id = $1 AND id <> $2 AND role IN ('org_owner', 'org_admin') AND status = 'active'
    LIMIT 1
    `,
    [organizationId, memberId]
  );
  return result.rows.length > 0;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    return NextResponse.json({ members: await getMembers(id) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const role = String(body?.role || 'org_editor');
    if (!email || !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Registered user email and valid role are required.' }, { status: 400 });
    }
    const user = await pool.query(
      `SELECT id FROM users
       WHERE LOWER(email) = $1
         AND role = 'expert'
         AND is_verified_expert = TRUE
         AND COALESCE(is_hidden, FALSE) = FALSE
       LIMIT 1`,
      [email]
    );
    if (!user.rows.length) {
      return NextResponse.json({ error: 'No verified expert was found with that email.' }, { status: 404 });
    }
    await pool.query(
      `
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (organization_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
      `,
      [id, user.rows[0].id, role]
    );
    return NextResponse.json({ members: await getMembers(id) }, { status: 200 });
  } catch (error) {
    console.error('Error adding organization member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await requireOrganizationAdmin(request, id))) {
      return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    }
    const body = await request.json();
    const memberId = String(body?.member_id || '').trim();
    const role = String(body?.role || '');
    const status = String(body?.status || '');
    if (!memberId || !VALID_ROLES.has(role) || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Member id, valid role, and valid status are required.' }, { status: 400 });
    }
    const current = await pool.query(
      'SELECT role, status FROM organization_members WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [memberId, id]
    );
    if (!current.rows.length) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    if (current.rows[0].role === 'org_owner') {
      return NextResponse.json({ error: 'Organization ownership cannot be changed from member settings.' }, { status: 400 });
    }
    const removesActiveAdmin = current.rows[0].role === 'org_admin' && current.rows[0].status === 'active' && (role !== 'org_admin' || status !== 'active');
    if (removesActiveAdmin && !(await hasAnotherActiveAdmin(id, memberId))) {
      return NextResponse.json({ error: 'An organization must retain at least one active admin.' }, { status: 400 });
    }
    await pool.query(
      'UPDATE organization_members SET role = $3, status = $4, updated_at = NOW() WHERE id = $1 AND organization_id = $2',
      [memberId, id, role, status]
    );
    return NextResponse.json({ members: await getMembers(id) }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization member:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireOrganizationAdmin(request, id);
    if (!auth) return NextResponse.json({ error: 'Organization admin access required.' }, { status: 403 });
    const body = await request.json();
    const memberId = String(body?.member_id || '').trim();
    const current = await pool.query(
      'SELECT user_id, role, status FROM organization_members WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [memberId, id]
    );
    if (!current.rows.length) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    if (current.rows[0].role === 'org_owner') {
      return NextResponse.json({ error: 'The organization owner cannot be removed.' }, { status: 400 });
    }
    if (current.rows[0].user_id === auth.sub) {
      return NextResponse.json({ error: 'You cannot remove your own organization membership.' }, { status: 400 });
    }
    if (current.rows[0].role === 'org_admin' && current.rows[0].status === 'active' && !(await hasAnotherActiveAdmin(id, memberId))) {
      return NextResponse.json({ error: 'An organization must retain at least one active admin.' }, { status: 400 });
    }
    await pool.query('DELETE FROM organization_members WHERE id = $1 AND organization_id = $2', [memberId, id]);
    return NextResponse.json({ members: await getMembers(id) }, { status: 200 });
  } catch (error) {
    console.error('Error deleting organization member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
