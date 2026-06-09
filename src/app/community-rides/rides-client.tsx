'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { fetchEvents } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type { Event } from '@/types';
import { getSportLabel } from '@/services/constants/sports';
import DateText from '@/components/ui/date-text';
import { COMMUNITY_NAME } from '@/lib/branding';
import { useCurrentUser } from '@/hooks/use-current-user';
import CommunityEventForm from '@/components/feature-components/community-event-form/community-event-form';

function isWeekend(dateValue: string) {
  const day = new Date(dateValue).getDay();
  return day === 0 || day === 6;
}

function isBiweeklyOrLongRide(event: Event) {
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  return text.includes('biweekly') || text.includes('long ride');
}

function isMidweek(dateValue: string) {
  const day = new Date(dateValue).getDay();
  return day >= 1 && day <= 5;
}

function isEnduranceOrTrail(event: Event) {
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  return text.includes('endurance') || text.includes('trail');
}

function EventList({ title, description, events }: { title: string; description: string; events: Event[] }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/75">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-gray-950 dark:text-gray-50">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-slate-300">{description}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/45 dark:text-emerald-200">
          {events.length} planned
        </span>
      </div>

      {events.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 text-sm text-gray-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-slate-300">
          No events published for this category yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-emerald-700/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-bold text-gray-950 dark:text-gray-50">{event.title}</p>
                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {event.sport_type ? getSportLabel(event.sport_type) : 'Community ride'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
                  <DateText value={event.event_date} pattern="EEE, MMM d • p" />
                </span>
                {event.city && (
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
                    {event.city}
                  </span>
                )}
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
                  NPR {Number(event.price_npr || 0) === 0 ? 'Free' : Number(event.price_npr || 0)}
                </span>
              </div>
              {event.description && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-slate-300">{event.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CommunityRidesClient() {
  const queryClient = useQueryClient();
  const { data: currentUser = null } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: QUERY_KEYS.events.list({ upcoming: true, community: true }),
    queryFn: ({ signal }) => fetchEvents({ upcoming: true, community: true }, signal),
  });

  const weekendOrBiweekly = useMemo(
    () =>
      events.filter(
        (event) =>
          event.sport_type !== 'training' &&
          (isWeekend(event.event_date) || isBiweeklyOrLongRide(event))
      ),
    [events]
  );

  const midweekEnduranceOrTrail = useMemo(
    () =>
      events.filter(
        (event) =>
          event.sport_type !== 'training' &&
          isMidweek(event.event_date) &&
          (isEnduranceOrTrail(event) ||
            event.sport_type === 'trail_running' ||
            event.sport_type === 'mtb')
      ),
    [events]
  );

  const communityTrainingEvents = useMemo(
    () =>
      events.filter((event) => {
        const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
        return event.sport_type === 'training' || text.includes('training');
      }),
    [events]
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-7 shadow-sm md:px-8 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              {COMMUNITY_NAME}
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Weekly Ride Plan
            </span>
          </div>
          <h1 className="text-balance text-3xl font-black tracking-tight text-gray-950 dark:text-gray-50 sm:text-5xl">
            Community rides for people who show up.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
            Weekend long rides, midweek endurance sessions, and training blocks organized around local routes.
          </p>
          {currentUser?.role === 'admin' && (
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <button className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-green-800 dark:bg-lime-300 dark:text-green-950 dark:hover:bg-lime-200">
                  Create Community Event
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-xl font-black text-gray-950 dark:text-white">
                        Create Community Event
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                        Build from available trails and select an event period format.
                      </p>
                    </div>
                    <Dialog.Close className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                      Close
                    </Dialog.Close>
                  </div>

                  <CommunityEventForm
                    onCompleted={async () => {
                      setOpen(false);
                      await queryClient.invalidateQueries({ queryKey: ['events'] });
                    }}
                    onCancel={() => setOpen(false)}
                  />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`community-rides-loading-${i}`}
              className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <EventList
              title="Weekend / Biweekly Long Rides"
              description="Long-route community rides scheduled mostly on weekends, with biweekly endurance blocks."
              events={weekendOrBiweekly}
            />
            <EventList
              title="Midweek Endurance / Trail Rides"
              description="Midweek sessions focused on consistency, trail skills, and endurance."
              events={midweekEnduranceOrTrail}
            />
          </div>
          <EventList
            title="Community Training Events"
            description="Structured training-focused sessions planned for seasonal progression."
            events={communityTrainingEvents}
          />
        </div>
      )}
    </div>
  );
}
