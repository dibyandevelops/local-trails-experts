import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `
      SELECT id, company_name, tier, logo_url, agenda, website_url
      FROM sponsors
      WHERE is_active = TRUE
      ORDER BY
        CASE tier
          WHEN 'gold' THEN 1
          WHEN 'silver' THEN 2
          WHEN 'bronze' THEN 3
          ELSE 4
        END,
        created_at DESC
      `
    );
    return NextResponse.json({ sponsors: result.rows }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    return NextResponse.json({ error: 'Failed to fetch sponsors' }, { status: 500 });
  }
}

