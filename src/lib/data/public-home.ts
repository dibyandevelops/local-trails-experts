import 'server-only';

import pool from '@/lib/db';

type HomeSpotlight =
  | {
      type: 'event';
      title: string;
      href: string;
      meta: string | null;
    }
  | {
      type: 'ride';
      title: string;
      href: string;
      meta: string | null;
    };

function formatDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-NP', { month: 'short', day: 'numeric' });
}

export async function getHomeSpotlight(): Promise<HomeSpotlight | null> {
  try {
    const eventResult = await pool.query(
      `
      SELECT id, title, event_date, city
      FROM events
      WHERE event_date >= NOW()
      ORDER BY event_date ASC
      LIMIT 1
      `
    );

    const event = eventResult.rows[0] as
      | { id: string; title: string; event_date: Date | string | null; city: string | null }
      | undefined;

    if (event) {
      const date = formatDate(event.event_date);
      return {
        type: 'event',
        title: event.title,
        href: `/events/${event.id}`,
        meta: [date, event.city].filter(Boolean).join(' · ') || null,
      };
    }

    const programResult = await pool.query(
      `
      SELECT p.title, u.name AS expert_name, t.name AS trail_name
      FROM expert_ride_programs p
      JOIN users u ON u.id = p.expert_user_id
      JOIN trails t ON t.id = p.trail_id
      WHERE p.is_active = TRUE
        AND u.role = 'expert'
        AND u.is_verified_expert = TRUE
        AND COALESCE(u.is_hidden, FALSE) = FALSE
        AND t.status = 'approved'
        AND COALESCE(t.is_hidden, FALSE) = FALSE
      ORDER BY p.updated_at DESC
      LIMIT 1
      `
    );

    const program = programResult.rows[0] as
      | { title: string; expert_name: string | null; trail_name: string | null }
      | undefined;

    if (program) {
      return {
        type: 'ride',
        title: program.title,
        href: '/ride-with-experts',
        meta: [program.expert_name, program.trail_name].filter(Boolean).join(' · ') || null,
      };
    }
  } catch (error) {
    console.warn('home: failed to fetch spotlight', error);
  }

  return null;
}
