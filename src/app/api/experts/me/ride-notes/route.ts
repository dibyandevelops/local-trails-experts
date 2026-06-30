import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isAllowedImageUrl } from '@/lib/image-url';
import { canOperateOrganization } from '@/lib/organization-access';

const categories = new Set([
  'trail_guide',
  'expert_note',
  'ride_report',
  'ride_note',
  'safety',
  'trail_work',
]);
const organizationCategories = new Set(['safety', 'trail_work']);
const expertCategories = new Set(['trail_guide', 'expert_note', 'ride_report', 'ride_note']);

const editableStatuses = new Set(['draft', 'pending_review']);

function requireRideNoteAuthor(request: NextRequest) {
  const auth = getAuthFromRequest(request);
  return auth?.role === 'expert' ? auth : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function getUniqueRideNoteSlug(title: string, existingId?: string) {
  const base = slugify(title) || 'ride-note';
  let slug = base;
  let suffix = 2;

  while (true) {
    const result = await pool.query(
      `
      SELECT id
      FROM ride_notes
      WHERE slug = $1
        AND ($2::uuid IS NULL OR id <> $2::uuid)
      LIMIT 1
      `,
      [slug, existingId || null]
    );

    if (result.rows.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function normalizeNullable(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function validateCoverImage(value: unknown) {
  const coverImageUrl = normalizeNullable(value);
  if (coverImageUrl && !isAllowedImageUrl(coverImageUrl, 650_000)) {
    return {
      value: null,
      error: 'Cover image must be a valid HTTPS image URL or supported image upload.',
    };
  }
  return { value: coverImageUrl, error: null };
}

async function assertAvailableTrail(trailId: string | null) {
  if (!trailId) return true;
  const result = await pool.query(
    `
    SELECT 1
    FROM trails t
    WHERE t.id = $1::uuid
      AND t.status = 'approved'
      AND COALESCE(t.is_hidden, FALSE) = FALSE
    LIMIT 1
    `,
    [trailId]
  );
  return result.rows.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireRideNoteAuthor(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [notesResult, trailsResult, organizationsResult] = await Promise.all([
      pool.query(
        `
        SELECT
          rn.id,
          rn.slug,
          rn.title,
          rn.excerpt,
          rn.content,
          rn.cover_image_url,
          rn.category,
          rn.status,
          rn.trail_id,
          rn.expert_user_id,
          rn.organization_id,
          rn.published_at,
          rn.created_at,
          rn.updated_at,
          t.name AS trail_name,
          t.slug AS trail_slug,
          expert.name AS expert_name,
          org.name AS organization_name
        FROM ride_notes rn
        LEFT JOIN trails t ON t.id = rn.trail_id
        LEFT JOIN users expert ON expert.id = rn.expert_user_id
        LEFT JOIN organizations org ON org.id = rn.organization_id
        WHERE rn.author_user_id = $1
        ORDER BY rn.created_at DESC
        LIMIT 100
        `,
        [auth.sub]
      ),
      pool.query(
        `
        SELECT t.id, t.name, t.slug, t.location, NULL::uuid AS organization_id
        FROM trails t
        WHERE t.status = 'approved'
          AND COALESCE(t.is_hidden, FALSE) = FALSE
        ORDER BY t.name ASC
        LIMIT 500
        `,
        []
      ),
      pool.query(
        `
        SELECT o.id, o.name, o.slug, om.role
        FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = $1
          AND om.status = 'active'
          AND om.role IN ('org_owner', 'org_admin', 'org_editor')
          AND o.is_active = TRUE
        ORDER BY o.name ASC
        `,
        [auth.sub]
      ),
    ]);

    return NextResponse.json({
      notes: notesResult.rows,
      trails: trailsResult.rows,
      experts: [],
      organizations: organizationsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching expert ride notes:', error);
    return NextResponse.json({ error: 'Failed to fetch ride notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRideNoteAuthor(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const status = editableStatuses.has(body?.status) ? body.status : 'draft';
    const category = categories.has(body?.category) ? body.category : 'expert_note';
    const trailId = normalizeNullable(body?.trail_id);
    const organizationId = normalizeNullable(body?.organization_id);

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    if (organizationId && (!organizationCategories.has(category) || !(await canOperateOrganization(auth.sub, organizationId)))) {
      return NextResponse.json({ error: 'Organization notes require active organization access and a safety or trail-work category.' }, { status: 403 });
    }
    if (!organizationId && !expertCategories.has(category)) {
      return NextResponse.json({ error: 'Safety and trail-work notes must be attributed to an organization.' }, { status: 400 });
    }
    if (!(await assertAvailableTrail(trailId))) {
      return NextResponse.json(
        { error: 'Ride notes can only link to approved, visible trails.' },
        { status: 400 }
      );
    }

    const coverImage = validateCoverImage(body?.cover_image_url);
    if (coverImage.error) {
      return NextResponse.json({ error: coverImage.error }, { status: 400 });
    }

    const slug = await getUniqueRideNoteSlug(title);
    const result = await pool.query(
      `
      INSERT INTO ride_notes (
        slug,
        title,
        excerpt,
        content,
        cover_image_url,
        category,
        status,
        author_user_id,
        trail_id,
        expert_user_id,
        organization_id,
        published_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid, $10::uuid, $11::uuid, NULL)
      RETURNING *
      `,
      [
        slug,
        title,
        normalizeNullable(body?.excerpt),
        content,
        coverImage.value,
        category,
        status,
        auth.sub,
        trailId,
        organizationId ? null : auth.sub,
        organizationId,
      ]
    );

    return NextResponse.json({ note: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating expert ride note:', error);
    return NextResponse.json({ error: 'Failed to create ride note' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRideNoteAuthor(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body?.id || '').trim();
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const status = editableStatuses.has(body?.status) ? body.status : 'draft';
    const category = categories.has(body?.category) ? body.category : 'expert_note';
    const trailId = normalizeNullable(body?.trail_id);
    const organizationId = normalizeNullable(body?.organization_id);

    if (!id || !title || !content) {
      return NextResponse.json({ error: 'Id, title, and content are required.' }, { status: 400 });
    }

    if (organizationId && (!organizationCategories.has(category) || !(await canOperateOrganization(auth.sub, organizationId)))) {
      return NextResponse.json({ error: 'Organization notes require active organization access and a safety or trail-work category.' }, { status: 403 });
    }
    if (!organizationId && !expertCategories.has(category)) {
      return NextResponse.json({ error: 'Safety and trail-work notes must be attributed to an organization.' }, { status: 400 });
    }
    if (!(await assertAvailableTrail(trailId))) {
      return NextResponse.json(
        { error: 'Ride notes can only link to approved, visible trails.' },
        { status: 400 }
      );
    }

    const coverImage = validateCoverImage(body?.cover_image_url);
    if (coverImage.error) {
      return NextResponse.json({ error: coverImage.error }, { status: 400 });
    }

    const slug = await getUniqueRideNoteSlug(title, id);
    const result = await pool.query(
      `
      UPDATE ride_notes
      SET
        slug = $2,
        title = $3,
        excerpt = $4,
        content = $5,
        cover_image_url = $6,
        category = $7,
        status = $8,
        trail_id = $9::uuid,
        expert_user_id = $10::uuid,
        organization_id = $11::uuid,
        published_at = NULL,
        updated_at = NOW()
      WHERE id = $1
        AND author_user_id = $12
        AND status <> 'published'
      RETURNING *
      `,
      [
        id,
        slug,
        title,
        normalizeNullable(body?.excerpt),
        content,
        coverImage.value,
        category,
        status,
        trailId,
        organizationId ? null : auth.sub,
        organizationId,
        auth.sub,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ride note not found or already published.' }, { status: 404 });
    }

    return NextResponse.json({ note: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error updating expert ride note:', error);
    return NextResponse.json({ error: 'Failed to update ride note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireRideNoteAuthor(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = String(request.nextUrl.searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Ride note id is required.' }, { status: 400 });
    }

    const result = await pool.query(
      `
      DELETE FROM ride_notes
      WHERE id = $1
        AND author_user_id = $2
        AND status <> 'published'
      RETURNING id, title
      `,
      [id, auth.sub]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ride note not found or already published.' }, { status: 404 });
    }

    return NextResponse.json({ note: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error('Error deleting expert ride note:', error);
    return NextResponse.json({ error: 'Failed to delete ride note' }, { status: 500 });
  }
}
