import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken, type AuthTokenPayload } from '@/lib/auth';
import type { User } from '@/types';

export function getServerAuthPayload(): AuthTokenPayload | null {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

export async function getServerCurrentUser(): Promise<User | null> {
  const auth = getServerAuthPayload();
  if (!auth) return null;
  const result = await pool.query(
    `
    SELECT id, name, email, role, bio, city, sports, is_verified_expert, phone, phone_verified_at, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [auth.sub]
  );
  return result.rows[0] || null;
}

