import 'server-only';
import pool from '@/lib/db';

export type EventSeo = {
  id: string;
  title: string;
  description: string | null;
  event_date: Date | string;
  meeting_point: string | null;
  city: string | null;
  sport_type: string | null;
  updated_at: Date | string | null;
  trail_id: string | null;
  trail_name: string | null;
  trail_location: string | null;
  host_name: string | null;
};

export async function getEventSeo(id: string): Promise<EventSeo | null> {
  const result = await pool.query(
    `
    SELECT
      e.id,
      e.title,
      e.description,
      e.event_date,
      e.meeting_point,
      e.city,
      e.sport_type,
      e.updated_at,
      e.trail_id,
      t.name as trail_name,
      t.location as trail_location,
      u.name as host_name
    FROM events e
    LEFT JOIN trails t ON e.trail_id = t.id
    LEFT JOIN users u ON e.host_user_id = u.id
    WHERE e.id = $1
    LIMIT 1
    `,
    [id]
  );

  return (result.rows[0] as EventSeo | undefined) ?? null;
}
