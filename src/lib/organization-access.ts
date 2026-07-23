import pool from '@/lib/db';

export type OrganizationMemberRole = 'org_owner' | 'org_admin' | 'org_editor';
export type OrganizationSubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled';
export type OrganizationSubscriptionPlan = 'free' | 'starter' | 'partner' | 'pro';

export type OrganizationRevenueEntitlement = {
  id: string;
  slug: string;
  name: string;
  isVerified: boolean;
  subscriptionStatus: OrganizationSubscriptionStatus;
  subscriptionPlan: OrganizationSubscriptionPlan;
  subscriptionExpiresAt: string | null;
  canCreateRevenueFeatures: boolean;
};

export async function getOrganizationMembership(userId: string, organizationId: string) {
  const result = await pool.query(
    `
    SELECT om.id, om.role, om.status
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    JOIN users u ON u.id = om.user_id
    WHERE om.user_id = $1
      AND (om.organization_id::text = $2 OR o.slug = $2)
      AND om.status = 'active'
      AND o.is_active = TRUE
      AND u.role = 'expert'
      AND u.is_verified_expert = TRUE
      AND COALESCE(u.is_hidden, FALSE) = FALSE
    LIMIT 1
    `,
    [userId, organizationId]
  );
  return (result.rows[0] as { id: string; role: OrganizationMemberRole; status: string } | undefined) || null;
}

export async function canOperateOrganization(userId: string, organizationId: string) {
  return Boolean(await getOrganizationMembership(userId, organizationId));
}

export async function canAdministerOrganization(userId: string, organizationId: string) {
  const membership = await getOrganizationMembership(userId, organizationId);
  return membership?.role === 'org_owner' || membership?.role === 'org_admin';
}

function mapRevenueEntitlement(row: any): OrganizationRevenueEntitlement {
  const expiresAt = row.subscription_expires_at
    ? row.subscription_expires_at instanceof Date
      ? row.subscription_expires_at.toISOString()
      : String(row.subscription_expires_at)
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isVerified: Boolean(row.is_verified),
    subscriptionStatus: row.subscription_status || 'inactive',
    subscriptionPlan: row.subscription_plan || 'free',
    subscriptionExpiresAt: expiresAt,
    canCreateRevenueFeatures: Boolean(row.can_create_revenue_features),
  };
}

export async function getOrganizationRevenueEntitlement(
  organizationId: string
): Promise<OrganizationRevenueEntitlement | null> {
  const result = await pool.query(
    `
    SELECT
      id,
      slug,
      name,
      is_verified,
      COALESCE(subscription_status, 'inactive') AS subscription_status,
      COALESCE(subscription_plan, 'free') AS subscription_plan,
      subscription_expires_at,
      (
        is_active = TRUE
        AND is_verified = TRUE
        AND COALESCE(subscription_status, 'inactive') IN ('trialing', 'active')
        AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
      ) AS can_create_revenue_features
    FROM organizations
    WHERE id::text = $1 OR slug = $1
    LIMIT 1
    `,
    [organizationId]
  );
  return result.rows[0] ? mapRevenueEntitlement(result.rows[0]) : null;
}

export async function canUseOrganizationRevenueFeatures(organizationId: string) {
  return Boolean((await getOrganizationRevenueEntitlement(organizationId))?.canCreateRevenueFeatures);
}

export async function getRevenueOrganizationForUser(
  userId: string
): Promise<OrganizationRevenueEntitlement | null> {
  const result = await pool.query(
    `
    SELECT
      o.id,
      o.slug,
      o.name,
      o.is_verified,
      COALESCE(o.subscription_status, 'inactive') AS subscription_status,
      COALESCE(o.subscription_plan, 'free') AS subscription_plan,
      o.subscription_expires_at,
      (
        o.is_active = TRUE
        AND o.is_verified = TRUE
        AND COALESCE(o.subscription_status, 'inactive') IN ('trialing', 'active')
        AND (o.subscription_expires_at IS NULL OR o.subscription_expires_at > NOW())
      ) AS can_create_revenue_features
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    JOIN users u ON u.id = om.user_id
    WHERE om.user_id = $1
      AND om.status = 'active'
      AND om.role IN ('org_owner', 'org_admin')
      AND o.is_active = TRUE
      AND u.role = 'expert'
      AND u.is_verified_expert = TRUE
      AND COALESCE(u.is_hidden, FALSE) = FALSE
    ORDER BY
      (o.owner_user_id = $1) DESC,
      o.is_verified DESC,
      o.created_at ASC
    LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] ? mapRevenueEntitlement(result.rows[0]) : null;
}
