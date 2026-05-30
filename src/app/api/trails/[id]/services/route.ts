import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

type ServiceType = 'shuttle' | 'lift' | 'support_vehicle';

type Row = {
  id: string;
  trail_id: string;
  organization_id: string | null;
  organization_name: string | null;
  service_type: ServiceType;
  title: string;
  description: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  price_note: string | null;
  schedule_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trailId = (id || '').trim();
    if (!trailId) {
      return NextResponse.json({ error: 'Trail id is required' }, { status: 400 });
    }

    const result = await pool.query(
      `
      SELECT
        ts.id,
        ts.trail_id,
        ts.organization_id,
        o.name AS organization_name,
        ts.service_type,
        ts.title,
        ts.description,
        ts.contact_phone,
        ts.contact_whatsapp,
        ts.contact_email,
        ts.price_note,
        ts.schedule_note,
        ts.is_active,
        ts.created_at::text,
        ts.updated_at::text
      FROM trail_services ts
      LEFT JOIN organizations o ON o.id = ts.organization_id
      WHERE ts.trail_id = $1
        AND ts.is_active = TRUE
        AND (ts.organization_id IS NULL OR o.is_active = TRUE)
      ORDER BY ts.updated_at DESC
      `,
      [trailId]
    );

    return NextResponse.json({ services: result.rows as Row[] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching trail services:', error);
    return NextResponse.json({ error: 'Failed to fetch trail services' }, { status: 500 });
  }
}
