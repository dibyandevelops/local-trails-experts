import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query(
      `SELECT expert_gallery_photos FROM users WHERE id = $1 AND role = 'expert' LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json(
      { photos: normalizeList(result.rows[0].expert_gallery_photos) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching expert gallery:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      action?: 'add' | 'delete';
      photo_url?: string;
    };
    const action = body?.action;
    const photoUrl = typeof body?.photo_url === 'string' ? body.photo_url.trim() : '';

    if (!action || !photoUrl) {
      return NextResponse.json({ error: 'action and photo_url are required' }, { status: 400 });
    }

    if (photoUrl.startsWith('data:image/') && photoUrl.length > 500_000) {
      return NextResponse.json(
        { error: 'Image is too large. Please upload a smaller image.' },
        { status: 413 }
      );
    }

    const expertResult = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (expertResult.rows.length === 0 || expertResult.rows[0].role !== 'expert') {
      return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
    }

    const isAdmin = auth.role === 'admin';
    const isOwnerExpert = auth.role === 'expert' && auth.sub === id;
    if (!isAdmin && !isOwnerExpert) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = '';
    if (action === 'add') {
      query = `
        UPDATE users
        SET expert_gallery_photos = (
          SELECT ARRAY(
            SELECT DISTINCT x FROM unnest(COALESCE(expert_gallery_photos, '{}') || ARRAY[$2]::text[]) AS x
            WHERE x IS NOT NULL AND x <> ''
          )
        ),
        updated_at = NOW()
        WHERE id = $1
        RETURNING expert_gallery_photos
      `;
    } else if (action === 'delete') {
      query = `
        UPDATE users
        SET expert_gallery_photos = ARRAY(
          SELECT x FROM unnest(COALESCE(expert_gallery_photos, '{}')) AS x
          WHERE x <> $2
        ),
        updated_at = NOW()
        WHERE id = $1
        RETURNING expert_gallery_photos
      `;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const update = await pool.query(query, [id, photoUrl]);
    return NextResponse.json(
      { photos: normalizeList(update.rows[0]?.expert_gallery_photos) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating expert gallery:', error);
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 });
  }
}

