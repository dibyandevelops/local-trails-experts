import type { Metadata } from 'next';
import { getEventSeo } from '@/lib/data/public-events';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

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
      keywords: [
        `${event.title} Nepal`,
        `${event.sport_type || 'mtb'} event Nepal`,
        'bike event Nepal',
        'trail event Nepal',
      ],
      alternates: { canonical: `/events/${event.id}` },
      openGraph: {
        title,
        description,
        url: `/events/${event.id}`,
        siteName: SITE_NAME,
        type: 'article',
        images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
      },
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
  let event: Awaited<ReturnType<typeof getEventSeo>>;
  try {
    event = await getEventSeo(id);
  } catch {
    event = null;
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
