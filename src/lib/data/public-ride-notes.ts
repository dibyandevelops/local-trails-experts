import 'server-only';

import pool from '@/lib/db';

export type RideNoteCategory =
  | 'trail_guide'
  | 'expert_note'
  | 'ride_report'
  | 'safety'
  | 'trail_work'
  | 'ride_note';

export type PublicRideNote = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: RideNoteCategory;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  trail_id: string | null;
  trail_name: string | null;
  trail_slug: string | null;
  trail_location: string | null;
  expert_id: string | null;
  expert_name: string | null;
  expert_city: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug: string | null;
};

function normalizeDate(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapRideNote(row: any): PublicRideNote {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    cover_image_url: row.cover_image_url,
    category: row.category,
    published_at: normalizeDate(row.published_at),
    created_at: normalizeDate(row.created_at) || '',
    updated_at: normalizeDate(row.updated_at) || '',
    author_name: row.author_name,
    trail_id: row.trail_id,
    trail_name: row.trail_name,
    trail_slug: row.trail_slug,
    trail_location: row.trail_location,
    expert_id: row.expert_id,
    expert_name: row.expert_name,
    expert_city: row.expert_city,
    organization_id: row.organization_id,
    organization_name: row.organization_name,
    organization_slug: row.organization_slug,
  };
}

function plainText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function summarizeForSeo(note: PublicRideNote) {
  const source = plainText(note.excerpt || note.content);
  if (source.length <= 160) return source;
  return `${source.slice(0, 157).replace(/\s+\S*$/, '')}...`;
}

const rideNoteSelect = `
  rn.id,
  rn.slug,
  rn.title,
  rn.excerpt,
  rn.content,
  rn.cover_image_url,
  rn.category,
  rn.published_at,
  rn.created_at,
  rn.updated_at,
  author.name AS author_name,
  t.id AS trail_id,
  t.name AS trail_name,
  t.slug AS trail_slug,
  t.location AS trail_location,
  expert.id AS expert_id,
  expert.name AS expert_name,
  expert.city AS expert_city,
  org.id AS organization_id,
  org.name AS organization_name,
  org.slug AS organization_slug
`;

export async function getPublicRideNotes(limit = 24): Promise<PublicRideNote[]> {
  try {
    const result = await pool.query(
      `
      SELECT ${rideNoteSelect}
      FROM ride_notes rn
      LEFT JOIN users author ON author.id = rn.author_user_id
      LEFT JOIN trails t
        ON t.id = rn.trail_id
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      LEFT JOIN users expert
        ON expert.id = rn.expert_user_id
        AND expert.role = 'expert'
        AND COALESCE(expert.is_hidden, FALSE) = FALSE
      LEFT JOIN organizations org
        ON org.id = rn.organization_id
        AND org.is_active = TRUE
      WHERE rn.status = 'published'
      ORDER BY COALESCE(rn.published_at, rn.created_at) DESC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(mapRideNote);
  } catch (error) {
    console.warn('ride-notes: failed to fetch notes', error);
    return [];
  }
}

export async function getPublicRideNotesForTrail(
  trailId: string,
  limit = 3
): Promise<PublicRideNote[]> {
  try {
    const result = await pool.query(
      `
      SELECT ${rideNoteSelect}
      FROM ride_notes rn
      LEFT JOIN users author ON author.id = rn.author_user_id
      LEFT JOIN trails t
        ON t.id = rn.trail_id
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      LEFT JOIN users expert
        ON expert.id = rn.expert_user_id
        AND expert.role = 'expert'
        AND COALESCE(expert.is_hidden, FALSE) = FALSE
      LEFT JOIN organizations org
        ON org.id = rn.organization_id
        AND org.is_active = TRUE
      WHERE rn.status = 'published'
        AND rn.trail_id = $1
      ORDER BY COALESCE(rn.published_at, rn.created_at) DESC
      LIMIT $2
      `,
      [trailId, limit]
    );

    return result.rows.map(mapRideNote);
  } catch (error) {
    console.warn('ride-notes: failed to fetch trail notes', error);
    return [];
  }
}

export async function getPublicRideNoteBySlug(slug: string): Promise<PublicRideNote | null> {
  try {
    const result = await pool.query(
      `
      SELECT ${rideNoteSelect}
      FROM ride_notes rn
      LEFT JOIN users author ON author.id = rn.author_user_id
      LEFT JOIN trails t
        ON t.id = rn.trail_id
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      LEFT JOIN users expert
        ON expert.id = rn.expert_user_id
        AND expert.role = 'expert'
        AND COALESCE(expert.is_hidden, FALSE) = FALSE
      LEFT JOIN organizations org
        ON org.id = rn.organization_id
        AND org.is_active = TRUE
      WHERE rn.slug = $1
        AND rn.status = 'published'
      LIMIT 1
      `,
      [slug]
    );

    return result.rows[0] ? mapRideNote(result.rows[0]) : null;
  } catch (error) {
    console.warn('ride-notes: failed to fetch note', error);
    return null;
  }
}

export async function getRideNoteSeo(slug: string) {
  const note = await getPublicRideNoteBySlug(slug);
  if (!note) return null;
  return {
    title: note.title,
    description: summarizeForSeo(note),
    image: note.cover_image_url,
    slug: note.slug,
    category: note.category,
    published_at: note.published_at,
    created_at: note.created_at,
    updated_at: note.updated_at,
    author_name: note.author_name,
    expert_name: note.expert_name,
    organization_name: note.organization_name,
    trail_name: note.trail_name,
    trail_location: note.trail_location,
  };
}
