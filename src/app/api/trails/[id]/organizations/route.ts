import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `
      SELECT
        to2.id,
        to2.trail_id,
        to2.organization_id,
        to2.relation_type,
        to2.is_primary,
        to2.created_at,
        o.slug AS organization_slug,
        o.name AS organization_name,
        o.logo_url AS organization_logo_url,
        o.website_url AS organization_website_url,
        o.is_verified AS organization_is_verified
      FROM trail_organizations to2
      JOIN organizations o ON o.id = to2.organization_id
      WHERE to2.trail_id = $1
      ORDER BY
        to2.is_primary DESC,
        CASE to2.relation_type
          WHEN 'built_by' THEN 1
          WHEN 'verified_by' THEN 2
          ELSE 3
        END,
        to2.created_at DESC
      `,
      [id]
    );

    return NextResponse.json({ organizations: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trail organizations' },
      { status: 500 }
    );
  }
}
