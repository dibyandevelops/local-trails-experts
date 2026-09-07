import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import type { CommunityResource } from '@/types';


function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sportType = searchParams.get('sport_type');
    const pricingType = searchParams.get('pricing_type');
    const search = searchParams.get('search');
    const featuredOnly = searchParams.get('featured') === 'true';

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (category && category !== 'all') {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }

    if (sportType && sportType !== 'all') {
      conditions.push(`(sport_type = $${idx} OR sport_type = 'all')`);
      params.push(sportType);
      idx++;
    }

    if (pricingType && pricingType !== 'all') {
      conditions.push(`pricing_type = $${idx++}`);
      params.push(pricingType);
    }

    if (featuredOnly) {
      conditions.push(`is_featured = true`);
    }

    if (search && search.trim()) {
      conditions.push(`(
        title ILIKE $${idx} OR 
        description ILIKE $${idx} OR 
        tags::text ILIKE $${idx}
      )`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        id, title, slug, description, category, sport_type, pricing_type, price_note,
        external_url, icon_or_logo_url, youtube_handle_or_channel_id,
        is_verified_by_locoxperts, is_featured, platforms, tags, metadata,
        display_order, created_at, updated_at
      FROM community_resources
      ${whereClause}
      ORDER BY is_featured DESC, display_order ASC, title ASC
    `;

    const result = await pool.query<CommunityResource>(sql, params);
    return NextResponse.json({ resources: result.rows });
  } catch (error) {
    console.error('Error fetching community resources:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      sport_type = 'all',
      pricing_type = 'free',
      price_note,
      external_url,
      icon_or_logo_url,
      youtube_handle_or_channel_id,
      is_verified_by_locoxperts = true,
      is_featured = false,
      platforms = ['web'],
      tags = [],
      metadata = {},
      display_order = 0,
    } = body;

    if (!title || !description || !category || !external_url) {
      return NextResponse.json(
        { error: 'Title, description, category, and external URL are required.' },
        { status: 400 }
      );
    }

    let baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;

    // Check slug uniqueness
    while (true) {
      const existing = await pool.query('SELECT id FROM community_resources WHERE slug = $1', [slug]);
      if (existing.rows.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    const sql = `
      INSERT INTO community_resources (
        title, slug, description, category, sport_type, pricing_type, price_note,
        external_url, icon_or_logo_url, youtube_handle_or_channel_id,
        is_verified_by_locoxperts, is_featured, platforms, tags, metadata, display_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      title,
      slug,
      description,
      category,
      sport_type,
      pricing_type,
      price_note || null,
      external_url,
      icon_or_logo_url || null,
      youtube_handle_or_channel_id || null,
      Boolean(is_verified_by_locoxperts),
      Boolean(is_featured),
      JSON.stringify(Array.isArray(platforms) ? platforms : [platforms]),
      JSON.stringify(Array.isArray(tags) ? tags : []),
      JSON.stringify(typeof metadata === 'object' && metadata !== null ? metadata : {}),
      Number(display_order) || 0,
    ];

    const result = await pool.query<CommunityResource>(sql, values);
    return NextResponse.json({ resource: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating community resource:', error);
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}
