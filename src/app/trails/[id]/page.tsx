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
      COALESCE(associated_experts.expert_count, 0)::int AS associated_expert_count,
      COALESCE(associated_experts.experts, '[]'::json) AS associated_experts,
      CASE WHEN t.slug = $1 THEN 'slug' ELSE 'id' END AS matched_by
    FROM trails t
    LEFT JOIN users u ON t.submitted_by_user_id = u.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS expert_count,
        json_agg(
          json_build_object(
            'id', expert.id,
            'name', expert.name,
            'email', expert.email,
            'city', expert.city,
            'profile_photo_url', expert.profile_photo_url,
            'is_verified_expert', expert.is_verified_expert,
            'average_rating', COALESCE(er.average_rating, 0),
            'review_count', COALESCE(er.review_count, 0)
          )
          ORDER BY
            expert.is_verified_expert DESC,
            COALESCE(er.average_rating, 0) DESC,
            COALESCE(er.review_count, 0) DESC,
            (expert.profile_photo_url IS NOT NULL) DESC,
            et.sort_order ASC,
            et.created_at DESC
        ) AS experts
      FROM expert_trails et
      JOIN users expert ON expert.id = et.expert_user_id
      LEFT JOIN (
        SELECT
          expert_user_id,
          AVG(rating)::float AS average_rating,
          COUNT(*)::int AS review_count
        FROM expert_reviews
        GROUP BY expert_user_id
      ) er ON er.expert_user_id = expert.id
      WHERE et.trail_id = t.id
        AND expert.role = 'expert'
        AND COALESCE(expert.is_hidden, FALSE) = FALSE
    ) associated_experts ON TRUE
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

  if (!Array.isArray(trail.associated_experts)) {
    trail.associated_experts = [];
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
