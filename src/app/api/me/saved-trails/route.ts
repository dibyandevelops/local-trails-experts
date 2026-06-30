import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.slug,
        t.name,
        t.location,
        t.difficulty,
        t.sport_type,
        t.image_url,
        st.created_at AS saved_at
      FROM saved_trails st
      JOIN trails t ON t.id = st.trail_id
      WHERE st.user_id = $1
        AND ($2 = 'admin' OR (t.status = 'approved' AND COALESCE(t.is_hidden, FALSE) = FALSE))
      ORDER BY st.created_at DESC
      `,
      [auth.sub, auth.role]
    );

    return NextResponse.json({ trails: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching saved trails:', error);
    return NextResponse.json({ error: 'Failed to fetch saved trails' }, { status: 500 });
  }
}
