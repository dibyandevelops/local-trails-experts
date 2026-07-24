import 'server-only';
import pool from '@/lib/db';

export type OrganizationSubscriptionSettings = {
  payment_qr_image_url: string | null;
  payment_note: string;
  is_payment_enabled: boolean;
  updated_at: string | null;
};

export const DEFAULT_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE =
  'Scan the QR, pay from your wallet or bank app, then upload the payment screenshot for admin review.';

export async function getOrganizationSubscriptionSettings(): Promise<OrganizationSubscriptionSettings> {
  const result = await pool.query(
    `
    SELECT payment_qr_image_url, payment_note, is_payment_enabled, updated_at::text
    FROM platform_subscription_settings
    WHERE id = TRUE
    LIMIT 1
    `
  );
  const row = result.rows[0];
  return {
    payment_qr_image_url: row?.payment_qr_image_url || null,
    payment_note: row?.payment_note || DEFAULT_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE,
    is_payment_enabled: Boolean(row?.is_payment_enabled),
    updated_at: row?.updated_at || null,
  };
}
