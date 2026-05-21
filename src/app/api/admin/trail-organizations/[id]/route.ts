import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

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
    const body = (await request.json()) as { is_primary?: boolean };
    if (typeof body.is_primary !== 'boolean') {
      return NextResponse.json({ error: 'is_primary must be boolean' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lookup = await client.query(
        `
        SELECT id, trail_id, relation_type
        FROM trail_organizations
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (lookup.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }

      const assignment = lookup.rows[0] as {
        trail_id: string;
        relation_type: string;
      };

      if (body.is_primary) {
        await client.query(
          `
          UPDATE trail_organizations
          SET is_primary = FALSE
          WHERE trail_id = $1 AND relation_type = $2
          `,
          [assignment.trail_id, assignment.relation_type]
        );
      }

      const updated = await client.query(
        `
        UPDATE trail_organizations
        SET is_primary = $2
        WHERE id = $1
        RETURNING *
        `,
        [id, body.is_primary]
      );

      await client.query('COMMIT');
      return NextResponse.json({ assignment: updated.rows[0] }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating trail organization assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update trail organization assignment' },
      { status: 500 }
    );
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
    const result = await pool.query(
      `
      DELETE FROM trail_organizations
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trail organization assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete trail organization assignment' },
      { status: 500 }
    );
  }
}
