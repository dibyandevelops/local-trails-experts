import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getKomootNavigateUrl } from '@/lib/komoot';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const limited = await rateLimit(request, 'navigation-trail', 60, 60);
    if (limited) return limited;
    const { identifier } = await params;
    const result = await pool.query(
      `
      SELECT id, slug, name, location, difficulty, sport_type,
             latitude, longitude, distance_km, elevation_gain_m,
             estimated_time_hours, image_url, route_data, komoot_embed_url,
             updated_at
      FROM trails
      WHERE (id::text = $1 OR slug = $1)
        AND status = 'approved'
        AND COALESCE(is_hidden, FALSE) = FALSE
      ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END
      LIMIT 1
      `,
      [identifier]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Trail not found.' }, { status: 404 });
    }
    const trail = result.rows[0];
    if (trail.route_data && typeof trail.route_data === 'string') {
      trail.route_data = JSON.parse(trail.route_data);
    }
    const { komoot_embed_url: komootEmbedUrl, ...navigationTrail } = trail;
    return NextResponse.json({
      trail: {
        ...navigationTrail,
        komoot_url: getKomootNavigateUrl(komootEmbedUrl) || null,
      },
    });
  } catch (error) {
    console.error('Error fetching navigation trail:', error);
    return NextResponse.json({ error: 'Failed to fetch navigation trail.' }, { status: 500 });
  }
}
