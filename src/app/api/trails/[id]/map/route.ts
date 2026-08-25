import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const PUBLIC_TRAIL_MAP_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(request, 'trail-map', 60, 60);
  if (limited) return limited;

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

    return NextResponse.json(
      { trail },
      { status: 200, headers: PUBLIC_TRAIL_MAP_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching trail map:', error);
    return NextResponse.json({ error: 'Failed to fetch trail map data' }, { status: 500 });
  }
}
