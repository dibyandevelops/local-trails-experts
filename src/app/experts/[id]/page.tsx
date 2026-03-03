'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Event, User } from '@/types';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchExpertEvents, fetchExperts } from '@/services/experts/experts.service';
import { getSportLabel } from '@/services/constants/sports';

interface ExpertDetail extends User {
  events: Event[];
}

export default function ExpertDetailPage() {
  const params = useParams<{ id: string }>();
  const expertId = params?.id;

  const { data: expert, isLoading: loading } = useQuery<ExpertDetail | null>({
    queryKey: ['expert-detail', expertId || ''],
    queryFn: async ({ signal }) => {
      if (!expertId) return null;
      const [experts, events] = await Promise.all([
        fetchExperts({ id: expertId }, signal),
        fetchExpertEvents(expertId, signal),
      ]);
      const base = (experts || []).find((e: User) => e.id === expertId);
      if (!base) return null;
      return {
        ...(base as User),
        events: events || [],
      };
    },
    enabled: !!expertId,
  });

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading...</div>;
  }

  if (!expert) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Expert not found.</p>
        <Link
          href="/experts"
          className="inline-flex px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
        >
          Back to experts
        </Link>
      </div>
    );
  }

  const upcomingEvents = expert.events.filter(
    (e) => new Date(e.event_date) >= new Date()
  );
  const sports = Array.isArray(expert.sports) ? expert.sports : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-100 p-6 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
          Expert Showcase
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-1 text-xs text-gray-600">
              <Link href="/experts" className="underline hover:text-green-700">
                All experts
              </Link>{' '}
              / Profile
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              {expert.name || 'Local Expert'}
            </h1>
            {expert.city && <p className="mt-1 text-sm text-gray-700">{expert.city}</p>}
            {expert.bio && (
              <p className="mt-3 max-w-2xl text-sm text-gray-700">{expert.bio}</p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            {expert.is_verified_expert && (
              <span className="inline-flex items-center rounded-full bg-green-700 px-3 py-1 text-xs font-semibold text-white">
                Verified Expert
              </span>
            )}
            <Link
              href={`/events?expert=${expert.id}`}
              className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
            >
              View All Events
            </Link>
          </div>
        </div>
        {sports.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sports.map((sport) => (
              <span
                key={sport}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm"
              >
                {getSportLabel(sport)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Events</p>
            <p className="text-lg font-semibold text-gray-900">{expert.events.length}</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Upcoming</p>
            <p className="text-lg font-semibold text-gray-900">{upcomingEvents.length}</p>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Sports</p>
            <p className="text-lg font-semibold text-gray-900">{sports.length}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">
          Upcoming events with {expert.name || 'this expert'}
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-600">
            No upcoming events listed yet. Check back soon or browse other
            events.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {format(new Date(event.event_date), 'PPP p')}
                    {event.city ? ` • ${event.city}` : ''}
                  </p>
                  {event.sport_type && (
                    <p className="text-xs text-gray-500">
                      {getSportLabel(event.sport_type)}
                    </p>
                  )}
                  {event.meeting_point && (
                    <p className="text-xs text-gray-600 mt-1">
                      Meeting point: {event.meeting_point}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {event.price_npr > 0 && (
                    <p className="text-xs font-semibold text-gray-900">
                      NPR {event.price_npr}
                    </p>
                  )}
                  <Link
                    href={`/events?city=${encodeURIComponent(
                      event.city || ''
                    )}&sport=${encodeURIComponent(event.sport_type || '')}`}
                    className="inline-flex px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
                  >
                    View in events
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3 text-gray-900">
          All events by this expert
        </h2>
        {expert.events.length === 0 ? (
          <p className="text-sm text-gray-600">
            No events listed yet for this expert.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-700">
            {expert.events.map((event) => (
              <li key={event.id}>
                <span className="font-medium">{event.title}</span>
                {event.city && <span className="text-gray-500"> • {event.city}</span>}
                {event.sport_type && (
                  <span className="text-gray-500"> • {getSportLabel(event.sport_type)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
