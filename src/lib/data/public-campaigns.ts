import 'server-only';
import pool from '@/lib/db';

export type CampaignStatus = 'active' | 'looking_for_funds' | 'completed' | 'paused';

export type CampaignRow = {
  id: string;
  title: string;
  description: string | null;
  target_amount_npr: string;
  raised_amount_npr: string;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  organization_name: string;
  organization_slug: string;
  trail_name: string | null;
};

export type CampaignDetail = CampaignRow & {
  qr_image_url: string | null;
  payment_note: string | null;
  organization_contact_email: string | null;
  organization_contact_phone: string | null;
  organization_whatsapp_url: string | null;
  trail_id: string | null;
  updated_at: string;
};

export type CampaignMetadata = {
  title: string;
  description: string | null;
};

const PUBLIC_CAMPAIGN_STATUSES = "('active', 'looking_for_funds', 'completed', 'paused')";
const PUBLIC_REVENUE_ORGANIZATION_FILTER = `
  o.is_active = TRUE
  AND o.is_verified = TRUE
  AND COALESCE(o.subscription_status, 'inactive') IN ('trialing', 'active')
  AND (o.subscription_expires_at IS NULL OR o.subscription_expires_at > NOW())
`;

export async function getPublicCampaigns(): Promise<CampaignRow[]> {
  const result = await pool.query(
    `
    SELECT
      fc.id,
      fc.title,
      fc.description,
      fc.target_amount_npr::text,
      fc.raised_amount_npr::text,
      fc.status,
      fc.starts_at::text,
      fc.ends_at::text,
      o.name AS organization_name,
      o.slug AS organization_slug,
      t.name AS trail_name
    FROM fundraising_campaigns fc
    JOIN organizations o ON o.id = fc.organization_id
    LEFT JOIN trails t ON t.id = fc.trail_id
    WHERE fc.status IN ${PUBLIC_CAMPAIGN_STATUSES}
      AND ${PUBLIC_REVENUE_ORGANIZATION_FILTER}
    ORDER BY
      CASE fc.status
        WHEN 'looking_for_funds' THEN 1
        WHEN 'active' THEN 1
        WHEN 'paused' THEN 2
        ELSE 3
      END,
      fc.created_at DESC
    `
  );

  return result.rows as CampaignRow[];
}

export async function getPublicCampaignMetadata(
  campaignId: string
): Promise<CampaignMetadata | null> {
  const result = await pool.query(
    `
    SELECT fc.title, fc.description
    FROM fundraising_campaigns fc
    JOIN organizations o ON o.id = fc.organization_id
    WHERE fc.id = $1
      AND fc.status IN ${PUBLIC_CAMPAIGN_STATUSES}
      AND ${PUBLIC_REVENUE_ORGANIZATION_FILTER}
    LIMIT 1
    `,
    [campaignId]
  );

  return (result.rows[0] as CampaignMetadata | undefined) ?? null;
}

export async function getPublicCampaignDetail(
  campaignId: string
): Promise<CampaignDetail | null> {
  const result = await pool.query(
    `
    SELECT
      fc.id,
      fc.title,
      fc.description,
      fc.target_amount_npr::text,
      fc.raised_amount_npr::text,
      fc.qr_image_url,
      fc.payment_note,
      fc.status,
      fc.starts_at::text,
      fc.ends_at::text,
      fc.updated_at::text,
      o.name AS organization_name,
      o.slug AS organization_slug,
      o.contact_email AS organization_contact_email,
      o.contact_phone AS organization_contact_phone,
      o.whatsapp_url AS organization_whatsapp_url,
      t.id AS trail_id,
      t.name AS trail_name
    FROM fundraising_campaigns fc
    JOIN organizations o ON o.id = fc.organization_id
    LEFT JOIN trails t ON t.id = fc.trail_id
    WHERE fc.id = $1
      AND fc.status IN ${PUBLIC_CAMPAIGN_STATUSES}
      AND ${PUBLIC_REVENUE_ORGANIZATION_FILTER}
    LIMIT 1
    `,
    [campaignId]
  );

  return (result.rows[0] as CampaignDetail | undefined) ?? null;
}
