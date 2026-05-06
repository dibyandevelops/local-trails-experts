import { redirect } from 'next/navigation';
import type { RouteData, Trail } from '@/types';
import pool from '@/lib/db';
import TrailPageClient from './trail-page-client';
import { isUuidLike } from '@/lib/trail-slug';

export const revalidate = 300;

type Params = {
  id: string;
};

type FetchedTrail = Trail & {
  matched_by: 'id' | 'slug';
};

async function fetchPublicTrailByIdentifier(identifier: string): Promise<FetchedTrail | null> {
  const result = await pool.query(
    `
    SELECT
      t.*,
      CASE
        WHEN u.role = 'admin' THEN 'LocoMTBGroup'
        ELSE u.name
      END AS created_by,
      u.name AS submitted_by_name,
      u.email AS submitted_by_email,
      CASE WHEN t.slug = $1 THEN 'slug' ELSE 'id' END AS matched_by
    FROM trails t
    LEFT JOIN users u ON t.submitted_by_user_id = u.id
    WHERE (t.slug = $1 OR t.id::text = $1)
      AND t.status = 'approved'
      AND t.is_hidden = FALSE
    ORDER BY CASE WHEN t.slug = $1 THEN 0 ELSE 1 END
    LIMIT 1
    `,
    [identifier]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const trail = result.rows[0] as FetchedTrail & { route_data?: unknown; trail_images?: unknown };

  if (trail.route_data && typeof trail.route_data === 'string') {
    try {
      trail.route_data = JSON.parse(trail.route_data) as RouteData;
    } catch {
      trail.route_data = null;
    }
  }

  if (!Array.isArray(trail.trail_images)) {
    trail.trail_images = [];
  }

  return trail;
}

export async function generateStaticParams() {
  try {
    const result = await pool.query(
      `
      SELECT slug
      FROM trails
      WHERE status = 'approved' AND is_hidden = FALSE
      ORDER BY updated_at DESC
      LIMIT 1000
      `
    );

    return result.rows.map((row: { slug: string }) => ({ id: row.slug }));
  } catch {
    return [];
  }
}

export default async function TrailPage({ params }: { params: Promise<Params> }) {
  const { id: identifier } = await params;
  const initialTrail = await fetchPublicTrailByIdentifier(identifier);

  if (initialTrail?.slug && isUuidLike(identifier) && initialTrail.matched_by === 'id') {
    redirect(`/trails/${initialTrail.slug}`);
  }

  return <TrailPageClient trailId={initialTrail?.id || identifier} initialTrail={initialTrail} />;
}

