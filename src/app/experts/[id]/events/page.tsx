'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Event, User } from '@/types';
import { format } from 'date-fns';

interface ExpertDetail extends User {
  events: Event[];
}

export default function ExpertEventsPage() {
  const params = useParams<{ id: string }>();
  const expertId = params?.id;

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!expertId) return;
    void fetchExpert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const fetchExpert = async () => {
    try {
      setLoading(true);
      const [expertsRes, eventsRes] = await Promise.all([
        fetch(`/api/experts?id=${expertId}`),
        fetch(`/api/experts/${expertId}/events`),
      ]);

      const expertsData = await expertsRes.json();
      const eventsData = await eventsRes.json();

      const base = (expertsData.experts || []).find(
        (e: User) => e.id === expertId
      );

      if (!base) {
        setExpert(null);
      } else {
        setExpert({
          ...(base as User),
          events: eventsData.events || [],
        });
      }
    } catch (err) {
      console.error('Error loading expert events', err);
      setExpert(null);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1">
            <Link href="/experts" className="underline hover:text-green-700">
              All experts
            </Link>{' '}
            / Events
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Events by {expert.name || 'this expert'}
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

      {expert.events.length === 0 ? (
        <p className="text-sm text-gray-600">
          No events listed yet for this expert.
        </p>
      ) : (
        <div className="space-y-3">
          {expert.events.map((event) => (
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
                  href={`/events/${event.id}`}
                  className="inline-flex px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
                >
                  View event
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
