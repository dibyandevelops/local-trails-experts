import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || auth.role !== 'expert') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await pool.query(
      `
      SELECT
        om.id AS membership_id,
        om.role AS membership_role,
        om.status AS membership_status,
        o.id,
        o.slug,
        o.name,
        o.tagline,
        o.description,
        o.logo_url,
        o.website_url,
        o.instagram_url,
        o.facebook_url,
        o.whatsapp_url,
        o.contact_email,
        o.contact_phone,
        o.city,
        o.country,
        o.is_verified,
        o.is_active,
        o.owner_user_id,
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
      WHERE om.user_id = $1
        AND om.status = 'active'
        AND om.role IN ('org_owner', 'org_admin', 'org_editor')
        AND o.is_active = TRUE
      ORDER BY o.name ASC
      `,
      [auth.sub]
    );

    const trails = await pool.query(
      `
      SELECT DISTINCT ON (to2.trail_id, to2.organization_id)
        to2.id AS relation_id,
        to2.organization_id,
        to2.relation_type,
        to2.is_primary,
        t.id,
        t.slug,
        t.name,
        t.location,
        t.difficulty,
        t.sport_type,
        t.image_url
      FROM trail_organizations to2
      JOIN organization_members om
        ON om.organization_id = to2.organization_id
       AND om.user_id = $1
       AND om.status = 'active'
       AND om.role IN ('org_owner', 'org_admin', 'org_editor')
      JOIN organizations o ON o.id = to2.organization_id AND o.is_active = TRUE
      JOIN trails t ON t.id = to2.trail_id
      WHERE t.status = 'approved'
        AND t.is_hidden = FALSE
      ORDER BY to2.trail_id, to2.organization_id, to2.is_primary DESC, to2.created_at DESC
      `,
      [auth.sub]
    );

    return NextResponse.json(
      { organizations: memberships.rows, trails: trails.rows },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organization access' }, { status: 500 });
  }
}
