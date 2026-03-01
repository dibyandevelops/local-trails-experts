import pool from '@/lib/db';
import { firebaseAdminMessaging } from '@/lib/firebase-admin';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

async function getTokensByUserIds(userIds: string[]) {
  if (!userIds.length) return [];
  const result = await pool.query(
    `
      SELECT token
      FROM push_subscriptions
      WHERE user_id = ANY($1::uuid[])
    `,
    [userIds]
  );
  return result.rows.map((row) => row.token as string);
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

  const response = await firebaseAdminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    webpush: {
      fcmOptions: payload.url ? { link: payload.url } : undefined,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon.svg',
      },
      data: payload.url ? { url: payload.url } : undefined,
    },
  });

  const invalidTokens = response.responses
    .map((res, index) => ({ res, token: tokens[index] }))
    .filter(
      ({ res }) =>
        !res.success &&
        (res.error?.code === 'messaging/registration-token-not-registered' ||
          res.error?.code === 'messaging/invalid-registration-token')
    )
    .map(({ token }) => token);

  await cleanupInvalidTokens(invalidTokens);

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}

