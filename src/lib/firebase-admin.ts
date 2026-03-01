import admin from 'firebase-admin';
import { getServerEnv } from '@/lib/env.server';

const env = getServerEnv();

if (!admin.apps.length) {
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing Firebase Admin credentials');
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const firebaseAdminAuth = admin.auth();
export const firebaseAdminMessaging = admin.messaging();
