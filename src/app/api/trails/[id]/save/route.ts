import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ saved: false }, { status: 200 });
    }

    const { id } = await context.params;
    const result = await pool.query(
      `SELECT 1 FROM saved_trails WHERE user_id = $1 AND trail_id = $2 LIMIT 1`,
      [auth.sub, id]
    );

    return NextResponse.json({ saved: result.rows.length > 0 }, { status: 200 });
  } catch (error) {
    console.error('Error checking saved trail:', error);
    return NextResponse.json({ error: 'Failed to check saved trail' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await context.params;
    const trailResult = await pool.query(
      `
      SELECT id
      FROM trails
      WHERE id = $1
        AND ($2 = 'admin' OR (status = 'approved' AND COALESCE(is_hidden, FALSE) = FALSE))
      LIMIT 1
      `,
      [id, auth.role]
    );
    if (trailResult.rows.length === 0) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    await pool.query(
      `
      INSERT INTO saved_trails (user_id, trail_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, trail_id) DO NOTHING
      `,
      [auth.sub, id]
    );

    return NextResponse.json({ saved: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving trail:', error);
    return NextResponse.json({ error: 'Failed to save trail' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await context.params;
    await pool.query(`DELETE FROM saved_trails WHERE user_id = $1 AND trail_id = $2`, [
      auth.sub,
      id,
    ]);

    return NextResponse.json({ saved: false }, { status: 200 });
  } catch (error) {
    console.error('Error removing saved trail:', error);
    return NextResponse.json({ error: 'Failed to remove saved trail' }, { status: 500 });
  }
}
