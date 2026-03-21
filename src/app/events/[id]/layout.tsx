import type { Metadata } from 'next';
import pool from '@/lib/db';
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

async function getEventSeo(id: string) {
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
  return result.rows[0] as
    | {
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
      }
    | undefined;
}

export async function generateMetadata(
  _props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await _props.params;
  try {
    const event = await getEventSeo(id);
    if (!event) {
      return {
        title: 'Event not found',
        robots: { index: false, follow: false },
      };
    }

    const title = `${event.title} — Event`;
    const description =
      (event.description || '').trim() ||
      `Join ${event.title}${event.city ? ` in ${event.city}` : ''}.`;

    return {
      title,
      description,
      alternates: { canonical: `/events/${event.id}` },
      openGraph: {
        title,
        description,
        url: `/events/${event.id}`,
        siteName: SITE_NAME,
        type: 'article',
      },
      twitter: { title, description },
    };
  } catch {
    return {
      title: 'Event',
      description: DEFAULT_DESCRIPTION,
      alternates: { canonical: `/events/${id}` },
    };
  }
}

export default async function EventLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  let event: Awaited<ReturnType<typeof getEventSeo>> | undefined;
  try {
    event = await getEventSeo(id);
  } catch {
    event = undefined;
  }

  const eventUrl = absoluteUrl(`/events/${id}`);
  const jsonLd =
    event &&
    jsonLdStringify({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description || undefined,
      startDate: new Date(event.event_date).toISOString(),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: event.meeting_point || event.trail_name || event.city || 'Meeting point',
        address: event.city
          ? { '@type': 'PostalAddress', addressLocality: event.city }
          : event.trail_location
            ? { '@type': 'PostalAddress', addressLocality: event.trail_location }
            : undefined,
      },
      organizer: event.host_name
        ? { '@type': 'Organization', name: event.host_name }
        : { '@type': 'Organization', name: SITE_NAME },
      url: eventUrl,
    });

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      {props.children}
    </>
  );
}

