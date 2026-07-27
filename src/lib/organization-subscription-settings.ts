import 'server-only';
import pool from '@/lib/db';

export type OrganizationSubscriptionSettings = {
  payment_qr_image_url: string | null;
  payment_note: string;
  is_payment_enabled: boolean;
  updated_at: string | null;
  updated_by_admin_name: string | null;
  updated_by_admin_email: string | null;
};

export const DEFAULT_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE =
  'Scan the QR, pay from your wallet or bank app, then upload the payment screenshot for admin review.';

export async function getOrganizationSubscriptionSettings(): Promise<OrganizationSubscriptionSettings> {
  const result = await pool.query(
    `
    SELECT
      settings.payment_qr_image_url,
      settings.payment_note,
      settings.is_payment_enabled,
      settings.updated_at::text,
      admin.name AS updated_by_admin_name,
      admin.email AS updated_by_admin_email
    FROM platform_subscription_settings settings
    LEFT JOIN users admin ON admin.id = settings.updated_by_admin_id
    WHERE settings.id = TRUE
    LIMIT 1
    `
  );
  const row = result.rows[0];
  return {
    payment_qr_image_url: row?.payment_qr_image_url || null,
    payment_note: row?.payment_note || DEFAULT_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE,
    is_payment_enabled: Boolean(row?.is_payment_enabled),
    updated_at: row?.updated_at || null,
    updated_by_admin_name: row?.updated_by_admin_name || null,
    updated_by_admin_email: row?.updated_by_admin_email || null,
  };
}
