import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = (request.nextUrl.searchParams.get('organization_id') || '').trim();
    const where = organizationId
      ? 'WHERE ogi.organization_id = $1 AND o.is_active = TRUE'
      : 'WHERE o.is_active = TRUE';
    const values = organizationId ? [organizationId] : [];

    const result = await pool.query(
      `
      SELECT
        ogi.id,
        ogi.organization_id,
        o.name AS organization_name,
        ogi.image_url,
        ogi.caption,
        ogi.created_at::text
      FROM organization_gallery_items ogi
      JOIN organizations o ON o.id = ogi.organization_id
      ${where}
      ORDER BY ogi.created_at ASC, ogi.id ASC
      `,
      values
    );

    return NextResponse.json({ items: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin organization gallery:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery items' }, { status: 500 });
  }
}
