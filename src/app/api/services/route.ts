import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const category = String(request.nextUrl.searchParams.get('category') || '').trim();
    const search = String(request.nextUrl.searchParams.get('q') || '').trim();
    const values: unknown[] = [];
    const where = [
      's.is_active = TRUE',
      'o.is_active = TRUE',
      'o.is_verified = TRUE',
    ];
    if (category) {
      values.push(category);
      where.push(`s.category = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      where.push(`(s.title ILIKE $${values.length} OR COALESCE(s.description, '') ILIKE $${values.length} OR COALESCE(s.location, '') ILIKE $${values.length} OR o.name ILIKE $${values.length})`);
    }
    const result = await pool.query(
      `
      SELECT s.*, o.name AS organization_name, o.slug AS organization_slug,
             o.logo_url AS organization_logo_url, o.is_verified AS organization_is_verified,
             o.whatsapp_url AS organization_whatsapp_url, o.contact_phone AS organization_contact_phone
      FROM organization_services s
      JOIN organizations o ON o.id = s.organization_id
      WHERE ${where.join(' AND ')}
      ORDER BY o.is_verified DESC, s.created_at DESC
      LIMIT 100
      `,
      values
    );
    return NextResponse.json({
      services: result.rows.map((row) => ({ ...row, price_npr: row.price_npr === null ? null : Number(row.price_npr) })),
    });
  } catch (error) {
    console.error('Error fetching public organization services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
