import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        location,
        latitude,
        longitude,
        route_data
      FROM trails
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    const trail = result.rows[0];
    if (trail.route_data && typeof trail.route_data === 'string') {
      try {
        trail.route_data = JSON.parse(trail.route_data);
      } catch {
        // keep as-is
      }
    }

    return NextResponse.json({ trail }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail map:', error);
    return NextResponse.json({ error: 'Failed to fetch trail map data' }, { status: 500 });
  }
}

