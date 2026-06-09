import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { getServerEnv } from '@/lib/env.server';

const env = getServerEnv();

if (!getApps().length) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    // Do not hard-fail at module import time. Routes that only import push helpers
    // should still work when Firebase is intentionally not configured.
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Firebase Admin credentials are not configured; push and phone verification are disabled.');
    }
  } else {
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
}

export const firebaseAdminAuth = getApps().length
  ? getAuth()
  : ({
      // Only used in tests where Firebase Admin isn't configured.
      verifyIdToken: async () => {
        throw new Error('Firebase Admin is not configured');
      },
    } as unknown as ReturnType<typeof getAuth>);

export const firebaseAdminMessaging = getApps().length
  ? getMessaging()
  : ({
      // Used by tests that import code paths referencing push notifications.
      sendEachForMulticast: async () => ({
        successCount: 0,
        failureCount: 0,
        responses: [],
      }),
      isDisabled: true,
    } as unknown as ReturnType<typeof getMessaging>);
