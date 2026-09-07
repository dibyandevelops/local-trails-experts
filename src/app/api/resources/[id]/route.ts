import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import type { CommunityResource } from '@/types';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isNumeric = /^\d+$/.test(id);
    const sql = isNumeric
      ? 'SELECT * FROM community_resources WHERE id = $1'
      : 'SELECT * FROM community_resources WHERE slug = $1';

    const result = await pool.query<CommunityResource>(sql, [isNumeric ? Number(id) : id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource: result.rows[0] });
  } catch (error) {
    console.error('Error fetching resource:', error);
    return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      title,
      description,
      category,
      sport_type,
      pricing_type,
      price_note,
      external_url,
      icon_or_logo_url,
      youtube_handle_or_channel_id,
      is_verified_by_locoxperts,
      is_featured,
      platforms,
      tags,
      metadata,
      display_order,
    } = body;

    const sql = `
      UPDATE community_resources
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        sport_type = COALESCE($4, sport_type),
        pricing_type = COALESCE($5, pricing_type),
        price_note = $6,
        external_url = COALESCE($7, external_url),
        icon_or_logo_url = $8,
        youtube_handle_or_channel_id = $9,
        is_verified_by_locoxperts = COALESCE($10, is_verified_by_locoxperts),
        is_featured = COALESCE($11, is_featured),
        platforms = COALESCE($12::jsonb, platforms),
        tags = COALESCE($13::jsonb, tags),
        metadata = COALESCE($14::jsonb, metadata),
        display_order = COALESCE($15, display_order),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      title,
      description,
      category,
      sport_type,
      pricing_type,
      price_note ?? null,
      external_url,
      icon_or_logo_url ?? null,
      youtube_handle_or_channel_id ?? null,
      typeof is_verified_by_locoxperts === 'boolean' ? is_verified_by_locoxperts : null,
      typeof is_featured === 'boolean' ? is_featured : null,
      platforms ? JSON.stringify(platforms) : null,
      tags ? JSON.stringify(tags) : null,
      metadata ? JSON.stringify(metadata) : null,
      display_order !== undefined ? Number(display_order) : null,
      Number(id),
    ];

    const result = await pool.query<CommunityResource>(sql, values);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource: result.rows[0] });
  } catch (error) {
    console.error('Error updating community resource:', error);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const result = await pool.query('DELETE FROM community_resources WHERE id = $1 RETURNING id', [Number(id)]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting community resource:', error);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}
