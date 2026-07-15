import 'server-only';
import pool from '@/lib/db';
import type { RouteData, Trail } from '@/types';

export type FetchedTrail = Trail & {
  matched_by: 'id' | 'slug';
};

export type TrailSeo = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  elevation_gain_m: number | null;
  estimated_time_hours: number | null;
  difficulty: string;
  sport_type: string | null;
  image_url: string | null;
  trail_images: string[] | null;
  updated_at: Date | string | null;
};

export async function getTrailSeo(identifier: string): Promise<TrailSeo | null> {
  const result = await pool.query(
    `
    SELECT
      id,
      slug,
      name,
      description,
      location,
      latitude,
      longitude,
      distance_km,
      elevation_gain_m,
      estimated_time_hours,
      difficulty,
      sport_type,
      image_url,
      trail_images,
      updated_at
    FROM trails
    WHERE (slug = $1 OR id::text = $1)
      AND status = 'approved'
      AND is_hidden = FALSE
    ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END
    LIMIT 1
    `,
    [identifier]
  );

  return (result.rows[0] as TrailSeo | undefined) ?? null;
}

export async function fetchPublicTrailByIdentifier(
  identifier: string
): Promise<FetchedTrail | null> {
  const result = await pool.query(
    `
    SELECT
      t.id,
      t.slug,
      t.name,
      t.description,
      t.difficulty,
      t.sport_type,
      t.location,
      t.safety_labels,
      t.is_hazardous,
      t.hazard_note,
      t.hazard_updated_by,
      t.hazard_updated_at,
      t.latitude,
      t.longitude,
      t.distance_km,
      t.elevation_gain_m,
      t.estimated_time_hours,
      t.image_url,
      t.trail_images,
      t.komoot_embed_url,
      NULL::jsonb AS route_data,
      t.created_at,
      t.updated_at,
      t.submitted_by_user_id,
      t.status,
      t.is_hidden,
      CASE
        WHEN u.role = 'admin' THEN 'LocoMTBGroup'
        ELSE u.name
      END AS created_by,
      u.name AS submitted_by_name,
      u.email AS submitted_by_email,
      COALESCE(associated_experts.expert_count, 0)::int AS associated_expert_count,
      COALESCE(associated_experts.experts, '[]'::json) AS associated_experts,
      COALESCE(active_campaigns.campaign_count, 0)::int AS campaign_count,
      COALESCE(active_campaigns.campaigns, '[]'::json) AS active_campaigns,
      CASE WHEN t.slug = $1 THEN 'slug' ELSE 'id' END AS matched_by
    FROM trails t
    LEFT JOIN users u ON t.submitted_by_user_id = u.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS expert_count,
        json_agg(
          json_build_object(
            'id', expert_row.id,
            'name', expert_row.name,
            'email', expert_row.email,
            'city', expert_row.city,
            'profile_photo_url', expert_row.profile_photo_url,
            'is_verified_expert', expert_row.is_verified_expert,
            'average_rating', COALESCE(expert_row.average_rating, 0),
            'review_count', COALESCE(expert_row.review_count, 0)
          )
          ORDER BY
            expert_row.is_verified_expert DESC,
            COALESCE(expert_row.average_rating, 0) DESC,
            COALESCE(expert_row.review_count, 0) DESC,
            (expert_row.profile_photo_url IS NOT NULL) DESC,
            expert_row.sort_order ASC,
            expert_row.created_at DESC
        ) AS experts
      FROM (
        SELECT
          expert.id,
          expert.name,
          expert.email,
          expert.city,
          expert.profile_photo_url,
          expert.is_verified_expert,
          et.sort_order,
          et.created_at,
          AVG(er.rating)::float AS average_rating,
          COUNT(er.id)::int AS review_count
        FROM expert_trails et
        JOIN users expert ON expert.id = et.expert_user_id
        LEFT JOIN expert_reviews er ON er.expert_user_id = expert.id
        WHERE et.trail_id = t.id
          AND expert.role = 'expert'
          AND COALESCE(expert.is_hidden, FALSE) = FALSE
        GROUP BY
          expert.id,
          expert.name,
          expert.email,
          expert.city,
          expert.profile_photo_url,
          expert.is_verified_expert,
          et.sort_order,
          et.created_at
      ) expert_row
    ) associated_experts ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS campaign_count,
        json_agg(
          json_build_object(
            'id', fc.id,
            'title', fc.title,
            'description', fc.description,
            'target_amount_npr', fc.target_amount_npr::text,
            'raised_amount_npr', fc.raised_amount_npr::text,
            'organization_name', org.name,
            'organization_slug', org.slug
          )
          ORDER BY fc.created_at DESC
        ) AS campaigns
      FROM fundraising_campaigns fc
      JOIN organizations org ON org.id = fc.organization_id
      WHERE fc.trail_id = t.id
        AND fc.status IN ('active', 'looking_for_funds')
        AND org.is_active = TRUE
    ) active_campaigns ON TRUE
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

  if (!Array.isArray(trail.active_campaigns)) {
    trail.active_campaigns = [];
  }

  return trail;
}

export async function getPublicTrailStaticParams(limit = 1000): Promise<Array<{ id: string }>> {
  const result = await pool.query(
    `
    SELECT slug
    FROM trails
    WHERE status = 'approved' AND is_hidden = FALSE
    ORDER BY updated_at DESC
    LIMIT $1
    `,
    [limit]
  );

  return result.rows.map((row: { slug: string }) => ({ id: row.slug }));
}
