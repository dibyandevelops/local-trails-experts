import pool from '@/lib/db';

export type ImpactStats = {
  totalTrails: number;
  totalEvents: number;
  upcomingEvents: number;
  totalRiders: number;
  activeOrganizations: number;
  activeCampaigns: number;
  fundedAmountNpr: number;
  targetAmountNpr: number;
  hazardousTrails: number;
};

export async function getImpactStats(): Promise<ImpactStats> {
  const result = await pool.query(
    `
    WITH trail_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved' AND COALESCE(is_hidden, FALSE) = FALSE) AS total_trails,
        COUNT(*) FILTER (WHERE COALESCE(is_hazardous, FALSE) = TRUE) AS hazardous_trails
      FROM trails
    ),
    event_stats AS (
      SELECT
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE event_date >= NOW()) AS upcoming_events
      FROM events
    ),
    booking_riders AS (
      SELECT COUNT(DISTINCT b.user_id) AS rider_users
      FROM bookings b
      WHERE b.status <> 'cancelled'
    ),
    legacy_riders AS (
      SELECT COUNT(DISTINCT ep.participant_email) AS legacy_emails
      FROM event_participants ep
      LEFT JOIN users u ON u.email = ep.participant_email
      WHERE u.id IS NULL
    ),
    org_stats AS (
      SELECT COUNT(*) AS active_organizations
      FROM organizations
      WHERE is_active = TRUE
    ),
    campaign_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE fc.status = 'active') AS active_campaigns,
        COALESCE(SUM(fc.raised_amount_npr) FILTER (WHERE fc.status IN ('active', 'completed')), 0) AS funded_amount_npr,
        COALESCE(SUM(fc.target_amount_npr) FILTER (WHERE fc.status IN ('active', 'completed')), 0) AS target_amount_npr
      FROM fundraising_campaigns fc
      JOIN organizations o ON o.id = fc.organization_id
      WHERE o.is_active = TRUE
    )
    SELECT
      ts.total_trails::int,
      ts.hazardous_trails::int,
      es.total_events::int,
      es.upcoming_events::int,
      (br.rider_users + lr.legacy_emails)::int AS total_riders,
      os.active_organizations::int,
      cs.active_campaigns::int,
      cs.funded_amount_npr::bigint,
      cs.target_amount_npr::bigint
    FROM trail_stats ts
    CROSS JOIN event_stats es
    CROSS JOIN booking_riders br
    CROSS JOIN legacy_riders lr
    CROSS JOIN org_stats os
    CROSS JOIN campaign_stats cs
    `
  );

  const row = result.rows[0] || {};
  return {
    totalTrails: Number(row.total_trails || 0),
    totalEvents: Number(row.total_events || 0),
    upcomingEvents: Number(row.upcoming_events || 0),
    totalRiders: Number(row.total_riders || 0),
    activeOrganizations: Number(row.active_organizations || 0),
    activeCampaigns: Number(row.active_campaigns || 0),
    fundedAmountNpr: Number(row.funded_amount_npr || 0),
    targetAmountNpr: Number(row.target_amount_npr || 0),
    hazardousTrails: Number(row.hazardous_trails || 0),
  };
}
