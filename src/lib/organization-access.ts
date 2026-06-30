import pool from '@/lib/db';

export type OrganizationMemberRole = 'org_owner' | 'org_admin' | 'org_editor';

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
