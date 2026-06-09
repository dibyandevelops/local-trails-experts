import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { getServerEnv } from '@/lib/env.server';

const env = getServerEnv();

if (!getApps().length) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    // In unit tests we mock push/auth behaviors; don't hard-fail during module import.
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Missing Firebase Admin credentials');
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
    } as unknown as ReturnType<typeof getMessaging>);
