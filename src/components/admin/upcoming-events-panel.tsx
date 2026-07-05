'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import DateText from '@/components/ui/date-text';
import { fetchEvents } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type { Event } from '@/types';

export default function UpcomingEventsPanel() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: QUERY_KEYS.events.list({ upcoming: true }),
    queryFn: ({ signal }) => fetchEvents({ upcoming: true }, signal),
  });

  // eslint-disable-next-line react-hooks/purity
  const upcomingEvents = events.filter((event) => new Date(event.event_date).getTime() >= Date.now());

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:rounded-2xl sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming events</h2>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          {upcomingEvents.length}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">Loading upcoming events...</p>
      ) : upcomingEvents.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">No upcoming events found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">City</th>
                <th className="px-3 py-2 font-semibold">Participants</th>
                <th className="px-3 py-2 font-semibold">Price</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingEvents.map((event) => (
                <tr
                  key={event.id}
                  className="border-t border-gray-200 dark:border-slate-700"
                >
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-slate-100">
                    {event.title}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                    <DateText value={event.event_date} pattern="PPP p" />
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                    {event.city || '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                    {event.current_participants}/{event.max_participants}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                    {event.price_npr > 0 ? `NPR ${event.price_npr}` : 'Free'}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
