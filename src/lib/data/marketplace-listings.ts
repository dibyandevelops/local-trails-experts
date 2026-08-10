import 'server-only';

import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import {
  MARKETPLACE_LISTING_LIMIT,
  type MarketplaceListing,
  type MarketplaceListingInput,
  type MarketplaceListingStatus,
  type MarketplacePageData,
  type MarketplaceReport,
  type MarketplaceReportReason,
  type MarketplaceReportStatus,
} from '@/lib/marketplace';
import { getRevenueOrganizationForUser } from '@/lib/organization-access';

export class MarketplaceDataError extends Error {
  constructor(
    message: string,
    public code: 'not_found' | 'forbidden' | 'limit_reached' | 'duplicate_report'
  ) {
    super(message);
  }
}

const listingSelect = `
  ml.id,
  ml.organization_id,
  ml.owner_user_id,
  ml.title,
  ml.listing_type,
  ml.category,
  ml.condition,
  ml.price_npr,
  ml.location,
  ml.fit_label,
  ml.description,
  ml.highlights,
  ml.contact_methods,
  ml.contact_value,
  ml.status,
  ml.sold_at,
  ml.created_at,
  ml.updated_at,
  owner.name AS seller_name,
  owner.phone AS seller_phone,
  owner.email AS seller_email,
  owner.phone_verified_at IS NOT NULL AS seller_is_verified,
  org.name AS seller_organization_name,
  org.slug AS seller_organization_slug,
  COALESCE(
    (SELECT json_agg(image.image_url ORDER BY image.sort_order)
     FROM marketplace_listing_images image
     WHERE image.listing_id = ml.id),
    '[]'::json
  ) AS images,
  (SELECT COUNT(*)::int FROM marketplace_listing_reports report WHERE report.listing_id = ml.id) AS report_count,
  (SELECT COUNT(*)::int FROM marketplace_listing_reports report WHERE report.listing_id = ml.id AND report.status = 'open') AS open_report_count
`;

function iso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function mapListing(row: any, revealAllContact = false): MarketplaceListing {
  const contactMethods = Array.isArray(row.contact_methods) ? row.contact_methods : [];
  const contactValue = String(row.contact_value || '');
  const mayShowPhone = revealAllContact || contactMethods.includes('phone') || contactMethods.includes('whatsapp');
  const mayShowEmail = revealAllContact || contactMethods.includes('email');
  const selectedPhone = contactMethods.includes('phone') || contactMethods.includes('whatsapp') ? contactValue : row.seller_phone;
  const selectedEmail = contactMethods.includes('email') ? contactValue : row.seller_email;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    listingType: row.listing_type,
    category: row.category,
    condition: row.condition,
    priceNpr: Number(row.price_npr),
    location: row.location,
    fitLabel: row.fit_label,
    description: row.description,
    highlights: row.highlights || [],
    contactMethods,
    contactValue,
    status: row.status,
    images: row.images || [],
    seller: {
      id: row.owner_user_id,
      name: row.seller_organization_name || row.seller_name || 'Local rider',
      phone: mayShowPhone ? selectedPhone : null,
      email: mayShowEmail ? selectedEmail : null,
      isVerified: Boolean(row.seller_organization_name || row.seller_is_verified),
      organizationId: row.organization_id || null,
      organizationName: row.seller_organization_name || null,
      organizationSlug: row.seller_organization_slug || null,
    },
    reportCount: Number(row.report_count || 0),
    openReportCount: Number(row.open_report_count || 0),
    createdAt: iso(row.created_at) || '',
    updatedAt: iso(row.updated_at) || '',
    soldAt: iso(row.sold_at),
  };
}

async function selectListings(where: string, values: unknown[], revealAllContact = false) {
  const result = await pool.query(
    `
    SELECT ${listingSelect}
    FROM marketplace_listings ml
    JOIN users owner ON owner.id = ml.owner_user_id
    LEFT JOIN organizations org ON org.id = ml.organization_id
    WHERE ${where}
    ORDER BY ml.created_at DESC
    LIMIT 200
    `,
    values
  );
  return result.rows.map((row) => mapListing(row, revealAllContact));
}

export async function getPublicMarketplaceListings() {
  return selectListings(
    `
    ml.status = 'active'
    AND org.is_active = TRUE
    AND org.is_verified = TRUE
    `,
    []
  );
}

export async function getMarketplacePageData(userId?: string | null): Promise<MarketplacePageData> {
  const publicPromise = getPublicMarketplaceListings();
  if (!userId) {
    return {
      listings: await publicPromise,
      myListings: [],
      viewer: null,
      listingLimit: MARKETPLACE_LISTING_LIMIT,
    };
  }

  const [listings, userResult, myListings] = await Promise.all([
    publicPromise,
    pool.query(
      `SELECT id, role, phone, email, phone_verified_at IS NOT NULL AS is_phone_verified FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    ),
    selectListings("ml.owner_user_id = $1 AND ml.status <> 'deleted'", [userId], true),
  ]);
  const user = userResult.rows[0];
  const revenueOrganization = user ? await getRevenueOrganizationForUser(userId) : null;
  return {
    listings,
    myListings,
    viewer: user
      ? {
          id: user.id,
          role: user.role,
          isPhoneVerified: Boolean(user.is_phone_verified),
          phone: user.phone || null,
          email: user.email || null,
          revenueOrganization,
        }
      : null,
    listingLimit: MARKETPLACE_LISTING_LIMIT,
  };
}

async function replaceListingImages(client: PoolClient, listingId: string, images: string[]) {
  await client.query('DELETE FROM marketplace_listing_images WHERE listing_id = $1', [listingId]);
  for (let index = 0; index < images.length; index += 1) {
    const imageUrl = images[index];
    await client.query(
      `INSERT INTO marketplace_listing_images (listing_id, image_url, sort_order) VALUES ($1, $2, $3)`,
      [listingId, imageUrl, index]
    );
  }
}

export async function createMarketplaceListing(userId: string, input: MarketplaceListingInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`marketplace:${userId}`]);
    const revenueOrganization = await getRevenueOrganizationForUser(userId);
    if (!revenueOrganization?.canCreateRevenueFeatures) {
      throw new MarketplaceDataError(
        'A verified organization with an active subscription is required to publish marketplace listings.',
        'forbidden'
      );
    }
    const userResult = await client.query(
      `SELECT id, role, phone, phone_verified_at FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) throw new MarketplaceDataError('User not found.', 'not_found');
    if (user.role !== 'admin' && !user.phone_verified_at) {
      throw new MarketplaceDataError('Verify your phone number before posting an item.', 'forbidden');
    }
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM marketplace_listings WHERE owner_user_id = $1 AND status IN ('active', 'hidden')`,
      [userId]
    );
    if (Number(countResult.rows[0]?.count || 0) >= MARKETPLACE_LISTING_LIMIT) {
      throw new MarketplaceDataError(`You can have up to ${MARKETPLACE_LISTING_LIMIT} live listings.`, 'limit_reached');
    }

    const result = await client.query(
      `
      INSERT INTO marketplace_listings (
        organization_id, owner_user_id, title, listing_type, category, condition, price_npr,
        location, fit_label, description, highlights, contact_methods, contact_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), $10, $11::text[], $12::text[], $13)
      RETURNING id
      `,
      [
        revenueOrganization.id,
        userId,
        input.title,
        input.listingType,
        input.category,
        input.condition,
        input.priceNpr,
        input.location,
        input.fitLabel,
        input.description,
        input.highlights,
        input.contactMethods,
        input.contactValue,
      ]
    );
    await replaceListingImages(client, result.rows[0].id, input.images);
    await client.query('COMMIT');
    return result.rows[0].id as string;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMarketplaceListing(
  listingId: string,
  actor: { sub: string; role: string },
  input: MarketplaceListingInput
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT owner_user_id, status FROM marketplace_listings WHERE id = $1 FOR UPDATE`,
      [listingId]
    );
    const listing = existing.rows[0];
    if (!listing || listing.status === 'deleted') throw new MarketplaceDataError('Listing not found.', 'not_found');
    if (actor.role !== 'admin' && listing.owner_user_id !== actor.sub) {
      throw new MarketplaceDataError('You cannot edit this listing.', 'forbidden');
    }
    await client.query(
      `
      UPDATE marketplace_listings
      SET title = $2, listing_type = $3, category = $4, condition = $5,
          price_npr = $6, location = $7, fit_label = NULLIF($8, ''),
          description = $9, highlights = $10::text[], contact_methods = $11::text[],
          contact_value = $12
      WHERE id = $1
      `,
      [
        listingId,
        input.title,
        input.listingType,
        input.category,
        input.condition,
        input.priceNpr,
        input.location,
        input.fitLabel,
        input.description,
        input.highlights,
        input.contactMethods,
        input.contactValue,
      ]
    );
    await replaceListingImages(client, listingId, input.images);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function setMarketplaceListingStatus(
  listingId: string,
  actor: { sub: string; role: string },
  status: MarketplaceListingStatus
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT owner_user_id, status FROM marketplace_listings WHERE id = $1 FOR UPDATE`,
      [listingId]
    );
    const listing = existing.rows[0];
    if (!listing || listing.status === 'deleted') throw new MarketplaceDataError('Listing not found.', 'not_found');
    if (actor.role !== 'admin' && listing.owner_user_id !== actor.sub) {
      throw new MarketplaceDataError('You cannot manage this listing.', 'forbidden');
    }
    if (status === 'active' && actor.role !== 'admin') {
      const revenueOrganization = await getRevenueOrganizationForUser(actor.sub);
      if (!revenueOrganization?.canCreateRevenueFeatures) {
        throw new MarketplaceDataError(
          'A verified organization with an active subscription is required to activate marketplace listings.',
          'forbidden'
        );
      }
    }
    if (actor.role !== 'admin' && status === 'deleted') {
      throw new MarketplaceDataError('Use the delete action for this listing.', 'forbidden');
    }
    if (status === 'active' && !['active', 'hidden'].includes(listing.status)) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`marketplace:${listing.owner_user_id}`]);
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM marketplace_listings WHERE owner_user_id = $1 AND status IN ('active', 'hidden')`,
        [listing.owner_user_id]
      );
      if (Number(countResult.rows[0]?.count || 0) >= MARKETPLACE_LISTING_LIMIT) {
        throw new MarketplaceDataError(`This seller already has ${MARKETPLACE_LISTING_LIMIT} live listings.`, 'limit_reached');
      }
    }
    await client.query(
      `
      UPDATE marketplace_listings
      SET status = $2,
          sold_at = CASE WHEN $2 = 'sold' THEN COALESCE(sold_at, NOW()) ELSE NULL END,
          deleted_at = CASE WHEN $2 = 'deleted' THEN NOW() ELSE NULL END
      WHERE id = $1
      `,
      [listingId, status]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMarketplaceListing(listingId: string, actor: { sub: string; role: string }) {
  const existing = await pool.query(
    `SELECT owner_user_id, status FROM marketplace_listings WHERE id = $1 LIMIT 1`,
    [listingId]
  );
  const listing = existing.rows[0];
  if (!listing || listing.status === 'deleted') throw new MarketplaceDataError('Listing not found.', 'not_found');
  if (actor.role !== 'admin' && listing.owner_user_id !== actor.sub) {
    throw new MarketplaceDataError('You cannot delete this listing.', 'forbidden');
  }
  await pool.query(
    `UPDATE marketplace_listings SET status = 'deleted', deleted_at = NOW() WHERE id = $1`,
    [listingId]
  );
}

export async function reportMarketplaceListing(
  listingId: string,
  reporterUserId: string,
  reason: MarketplaceReportReason,
  details: string | null
) {
  const listing = await pool.query(
    `SELECT owner_user_id, status FROM marketplace_listings WHERE id = $1 LIMIT 1`,
    [listingId]
  );
  if (!listing.rows[0] || listing.rows[0].status !== 'active') {
    throw new MarketplaceDataError('Listing not found.', 'not_found');
  }
  if (listing.rows[0].owner_user_id === reporterUserId) {
    throw new MarketplaceDataError('You cannot report your own listing.', 'forbidden');
  }
  try {
    await pool.query(
      `INSERT INTO marketplace_listing_reports (listing_id, reporter_user_id, reason, details) VALUES ($1, $2, $3, $4)`,
      [listingId, reporterUserId, reason, details]
    );
  } catch (error: any) {
    if (error?.code === '23505') {
      throw new MarketplaceDataError('You have already reported this listing.', 'duplicate_report');
    }
    throw error;
  }
}

export async function getAdminMarketplaceData() {
  const [listings, reportsResult] = await Promise.all([
    selectListings("ml.status <> 'deleted'", [], true),
    pool.query(
      `
      SELECT
        report.id,
        report.listing_id,
        listing.title AS listing_title,
        reporter.name AS reporter_name,
        reporter.email AS reporter_email,
        report.reason,
        report.details,
        report.status,
        report.created_at
      FROM marketplace_listing_reports report
      JOIN marketplace_listings listing ON listing.id = report.listing_id
      JOIN users reporter ON reporter.id = report.reporter_user_id
      ORDER BY CASE WHEN report.status = 'open' THEN 0 ELSE 1 END, report.created_at DESC
      LIMIT 300
      `
    ),
  ]);
  const reports: MarketplaceReport[] = reportsResult.rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    reporterName: row.reporter_name || 'User',
    reporterEmail: row.reporter_email,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: iso(row.created_at) || '',
  }));
  return { listings, reports };
}

export async function reviewMarketplaceReport(
  reportId: string,
  adminId: string,
  status: MarketplaceReportStatus
) {
  const result = await pool.query(
    `
    UPDATE marketplace_listing_reports
    SET status = $2, reviewed_by_admin_id = $3, reviewed_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [reportId, status, adminId]
  );
  if (!result.rows[0]) throw new MarketplaceDataError('Report not found.', 'not_found');
}
