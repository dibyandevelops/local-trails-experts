'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Event, User } from '@/types';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchExpertEvents, fetchExperts } from '@/services/experts/experts.service';

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">
            <Link href="/experts" className="underline hover:text-green-700">
              All experts
            </Link>{' '}
            / Profile
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            {expert.name || 'Local Expert'}
          </h1>
          {expert.city && (
            <p className="text-sm text-gray-600">{expert.city}</p>
          )}
        </div>
        {expert.is_verified_expert && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
            Verified Expert
          </span>
        )}
      </div>

      {expert.bio && (
        <p className="text-sm text-gray-700 mb-4">{expert.bio}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {Array.isArray(expert.sports) &&
          expert.sports.map((sport) => (
            <span
              key={sport}
              className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
            >
              {sport}
            </span>
          ))}
      </div>

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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
