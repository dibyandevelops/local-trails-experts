import pool from '@/lib/db';
import { firebaseAdminMessaging } from '@/lib/firebase-admin';
import { absoluteUrl } from '@/lib/seo';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

async function getTokensByUserIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) return [];
  const result = await pool.query(
    `
      SELECT token
      FROM push_subscriptions
      WHERE user_id = ANY($1::uuid[])
    `,
    [uniqueUserIds]
  );
  return Array.from(new Set(result.rows.map((row) => row.token as string).filter(Boolean)));
}

async function cleanupInvalidTokens(tokens: string[]) {
  if (!tokens.length) return;
  await pool.query(
    'DELETE FROM push_subscriptions WHERE token = ANY($1::text[])',
    [tokens]
  );
}

export async function sendPushToUserIds(userIds: string[], payload: PushPayload) {
  const tokens = await getTokensByUserIds(userIds);
  if (!tokens.length) {
    return { sent: 0, failed: 0 };
  }
  const targetUrl = payload.url ? absoluteUrl(payload.url) : undefined;

  const response = await firebaseAdminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    webpush: {
      fcmOptions: targetUrl ? { link: targetUrl } : undefined,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-64x64.png',
      },
      data: {
        title: payload.title,
        body: payload.body,
        ...(targetUrl ? { url: targetUrl } : {}),
      },
    },
  });

  const invalidTokens = response.responses
    .map((res, index) => ({ res, token: tokens[index] }))
    .filter(
      ({ res }) =>
        !res.success &&
        (res.error?.code === 'messaging/registration-token-not-registered' ||
          res.error?.code === 'messaging/invalid-registration-token' ||
          res.error?.code === 'messaging/mismatched-credential')
    )
    .map(({ token }) => token);

  await cleanupInvalidTokens(invalidTokens);

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}
