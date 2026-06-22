import 'server-only';
import pool from '@/lib/db';

export type ExpertSeo = {
  id: string;
  name: string | null;
  bio: string | null;
  city: string | null;
  is_verified_expert: boolean;
  updated_at: Date | string | null;
};

export async function getExpertSeo(id: string): Promise<ExpertSeo | null> {
  const result = await pool.query(
    `
    SELECT id, name, bio, city, is_verified_expert, updated_at
    FROM users
    WHERE id = $1 AND role = 'expert'
    LIMIT 1
    `,
    [id]
  );

  return (result.rows[0] as ExpertSeo | undefined) ?? null;
}
