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
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled' | null;
  subscription_plan: 'free' | 'starter' | 'partner' | 'pro' | null;
  subscription_expires_at: string | null;
  can_create_revenue_features: boolean;
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
      o.subscription_status,
      o.subscription_plan,
      o.subscription_expires_at::text,
      (
        o.is_verified = TRUE
        AND COALESCE(o.subscription_status, 'inactive') IN ('trialing', 'active')
        AND (o.subscription_expires_at IS NULL OR o.subscription_expires_at > NOW())
      ) AS can_create_revenue_features,
      COUNT(DISTINCT om.user_id)::int AS member_count,
      COUNT(DISTINCT to2.trail_id)::int AS trail_count
    FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
    LEFT JOIN trail_organizations to2 ON to2.organization_id = o.id
    WHERE o.is_active = TRUE
    GROUP BY o.id
    ORDER BY can_create_revenue_features DESC, o.is_verified DESC, trail_count DESC, o.created_at DESC
    `
  );

  return result.rows as OrganizationRow[];
}
