import 'server-only';
import pool from '@/lib/db';

export type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  member_count: number;
  trail_count: number;
};

export async function getPublicOrganizations(): Promise<OrganizationRow[]> {
  const result = await pool.query(
    `
    SELECT
      o.id,
      o.slug,
      o.name,
      o.tagline,
      o.logo_url,
      o.city,
      o.country,
      o.is_verified,
      COUNT(DISTINCT om.user_id)::int AS member_count,
      COUNT(DISTINCT to2.trail_id)::int AS trail_count
    FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
    LEFT JOIN trail_organizations to2 ON to2.organization_id = o.id
    WHERE o.is_active = TRUE
    GROUP BY o.id
    ORDER BY o.is_verified DESC, o.created_at DESC
    `
  );

  return result.rows as OrganizationRow[];
}
