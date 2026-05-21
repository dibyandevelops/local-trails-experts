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
    const body = (await request.json()) as {
      role?: OrgMemberRole;
      status?: OrgMemberStatus;
    };

    const updates: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    if (body.role !== undefined) {
      if (!isValidRole(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updates.push(`role = $${idx}`);
      values.push(body.role);
      idx += 1;
    }

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.push(`status = $${idx}`);
      values.push(body.status);
      idx += 1;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');

    const result = await pool.query(
      `
      UPDATE organization_members
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ member: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization member:', error);
    return NextResponse.json(
      { error: 'Failed to update organization member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(_request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await pool.query(
      `
      DELETE FROM organization_members
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting organization member:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization member' },
      { status: 500 }
    );
  }
}
