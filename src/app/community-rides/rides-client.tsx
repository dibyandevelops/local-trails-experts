'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { createEvent, fetchEvents } from '@/services/events/events.service';
import { fetchTrailsPaginated } from '@/services/trails/trails.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type { CreateEventInput, Event, SportType, Trail } from '@/types';
import { getSportLabel } from '@/services/constants/sports';
import DateText from '@/components/ui/date-text';
import { COMMUNITY_NAME } from '@/lib/branding';
import { useCurrentUser } from '@/hooks/use-current-user';

type CommunityPeriod =
  | 'weekly'
  | 'biweekly_long_ride'
  | 'midweek_endurance_trail'
  | 'quarterly_training';

const COMMUNITY_PERIOD_OPTIONS: Array<{ value: CommunityPeriod; label: string; helper: string }> = [
  {
    value: 'weekly',
    label: 'Weekly Ride',
    helper: 'Regular weekend community cycle rides.',
  },
  {
    value: 'biweekly_long_ride',
    label: 'Biweekly Long Ride',
    helper: 'Long-distance ride every two weeks.',
  },
  {
    value: 'midweek_endurance_trail',
    label: 'Midweek Endurance / Trail',
    helper: 'Midweek consistency and trail conditioning.',
  },
  {
    value: 'quarterly_training',
    label: 'Community Training Event',
    helper: 'Structured training events for progression blocks.',
  },
];

function toDateTimeLocal(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getDefaultDateForPeriod(period: CommunityPeriod) {
  const now = new Date();
  const next = new Date(now);
  const day = now.getDay();

  if (period === 'midweek_endurance_trail') {
    // Next Wednesday 6:00 AM
    const daysUntilWednesday = (3 - day + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntilWednesday);
    next.setHours(6, 0, 0, 0);
    return toDateTimeLocal(next);
  }

  if (period === 'quarterly_training') {
    // First Saturday of next quarter 6:30 AM
    const month = now.getMonth();
    const nextQuarterMonth = month < 3 ? 3 : month < 6 ? 6 : month < 9 ? 9 : 0;
    const year = month < 9 ? now.getFullYear() : now.getFullYear() + 1;
    next.setFullYear(year, nextQuarterMonth, 1);
    while (next.getDay() !== 6) next.setDate(next.getDate() + 1);
    next.setHours(6, 30, 0, 0);
    return toDateTimeLocal(next);
  }

  // Weekly + biweekly default to Saturday
  const baseDaysUntilSaturday = (6 - day + 7) % 7 || 7;
  next.setDate(now.getDate() + baseDaysUntilSaturday + (period === 'biweekly_long_ride' ? 7 : 0));
  next.setHours(6, 30, 0, 0);
  return toDateTimeLocal(next);
}

function getPeriodTitle(period: CommunityPeriod, trailName?: string) {
  const suffix = trailName ? ` • ${trailName}` : '';
  if (period === 'weekly') return `Weekly Community Ride${suffix}`;
  if (period === 'biweekly_long_ride') return `Biweekly Long Ride${suffix}`;
  if (period === 'midweek_endurance_trail') return `Midweek Endurance / Trail Ride${suffix}`;
  return 'Community Training Event';
}

function getPeriodDescription(period: CommunityPeriod, trail: Trail | undefined) {
  const base = trail?.description?.trim() || 'Community-led ride hosted by LocoXperts Community.';
  if (period === 'weekly') {
    return `${base}\n\nWeekly ride focused on skills, safety, and social cycling.`;
  }
  if (period === 'biweekly_long_ride') {
    return `${base}\n\nBiweekly long-ride format for stamina and route consistency.`;
  }
  if (period === 'midweek_endurance_trail') {
    return `${base}\n\nMidweek endurance/trail block to build consistency and trail handling.`;
  }
  return `${base}\n\nQuarterly training event for progression, coaching, and endurance goals.`;
}

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
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{description}</p>

      {events.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
          No events published for this category yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-emerald-700/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-200">
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
  const [period, setPeriod] = useState<CommunityPeriod>('weekly');
  const [trailId, setTrailId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(getDefaultDateForPeriod('weekly'));
  const [requiredExpertise, setRequiredExpertise] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [priceNpr, setPriceNpr] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const isQuarterlyTraining = period === 'quarterly_training';

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: QUERY_KEYS.events.list({ upcoming: true, community: true }),
    queryFn: ({ signal }) => fetchEvents({ upcoming: true, community: true }, signal),
  });

  const { data: trailsData } = useQuery({
    queryKey: QUERY_KEYS.trails.paginatedList({ page: 1, pageSize: 120 }),
    queryFn: ({ signal }) => fetchTrailsPaginated({ page: 1, pageSize: 120 }, signal),
    enabled: currentUser?.role === 'admin',
  });
  const trails = trailsData?.trails || [];

  const selectedTrail = useMemo(
    () => trails.find((trail) => trail.id === trailId),
    [trails, trailId]
  );

  useEffect(() => {
    setEventDate(getDefaultDateForPeriod(period));
    if (period === 'quarterly_training') {
      setTrailId('');
      setTitle(getPeriodTitle('quarterly_training'));
      setDescription(getPeriodDescription('quarterly_training', undefined));
      setMeetingPoint('');
    }
  }, [period]);

  useEffect(() => {
    if (period === 'quarterly_training') return;
    if (!selectedTrail) return;
    setTitle(getPeriodTitle(period, selectedTrail.name));
    setDescription(getPeriodDescription(period, selectedTrail));
    setMeetingPoint(selectedTrail.location || '');
  }, [selectedTrail, period]);

  const createCommunityEventMutation = useMutation({
    mutationFn: async () => {
      if (!isQuarterlyTraining && !selectedTrail) {
        throw new Error('Please select a trail.');
      }

      if (!meetingPoint.trim()) {
        throw new Error('Please set a meeting point.');
      }

      const payload: CreateEventInput = {
        title: title.trim(),
        description: description.trim(),
        trail_id: isQuarterlyTraining ? undefined : selectedTrail?.id,
        event_date: new Date(eventDate).toISOString(),
        organizer_name: COMMUNITY_NAME,
        organizer_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || '',
        max_participants: maxParticipants,
        meeting_point: meetingPoint.trim(),
        difficulty: isQuarterlyTraining ? undefined : selectedTrail?.difficulty,
        required_expertise: requiredExpertise,
        sport_type:
          isQuarterlyTraining
            ? ('training' as SportType)
            : (selectedTrail?.sport_type as SportType) || ('mtb' as SportType),
        city: isQuarterlyTraining ? 'Kathmandu, Nepal' : selectedTrail?.location || 'Kathmandu, Nepal',
        price_npr: Math.max(0, Number(priceNpr) || 0),
      };

      return createEvent(payload);
    },
    onSuccess: async () => {
      setMessage('Community event created.');
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to create community event.');
    },
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
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-7 shadow-sm md:px-8 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              {COMMUNITY_NAME}
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Weekly Ride Plan
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Community Cycling Calendar
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Weekend or biweekly long rides, plus midweek endurance and trail sessions organized for the local cycling community.
          </p>
          {currentUser?.role === 'admin' && (
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <button className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800">
                  Create Community Event
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                        Create Community Event
                      </Dialog.Title>
                      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                        Build from available trails and select an event period format.
                      </p>
                    </div>
                    <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                      Close
                    </Dialog.Close>
                  </div>

                  <form
                    className="mt-5 grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setMessage(null);
                      createCommunityEventMutation.mutate();
                    }}
                  >
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                        Event period
                      </label>
                      <select
                        value={period}
                        onChange={(event) => setPeriod(event.target.value as CommunityPeriod)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {COMMUNITY_PERIOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {COMMUNITY_PERIOD_OPTIONS.find((item) => item.value === period)?.helper}
                      </p>
                    </div>

                    {!isQuarterlyTraining && (
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Trail
                        </label>
                        <select
                          required
                          value={trailId}
                          onChange={(event) => setTrailId(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select a trail</option>
                          {trails.map((trail) => (
                            <option key={trail.id} value={trail.id}>
                              {trail.name} ({trail.location})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                        Event title
                      </label>
                      <input
                        required
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                        Description
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Date & time
                        </label>
                        <input
                          required
                          type="datetime-local"
                          value={eventDate}
                          onChange={(event) => setEventDate(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Expertise
                        </label>
                        <select
                          value={requiredExpertise}
                          onChange={(event) => setRequiredExpertise(event.target.value as 'beginner' | 'intermediate' | 'advanced' | 'expert')}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Max participants
                        </label>
                        <input
                          min={1}
                          type="number"
                          value={maxParticipants}
                          onChange={(event) => setMaxParticipants(Number(event.target.value) || 1)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Meeting point
                        </label>
                        <input
                          required
                          value={meetingPoint}
                          onChange={(event) => setMeetingPoint(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          placeholder="Google Maps friendly location"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Price (NPR)
                        </label>
                        <input
                          min={0}
                          type="number"
                          value={priceNpr}
                          onChange={(event) => setPriceNpr(Math.max(0, Number(event.target.value) || 0))}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Use 0 for free community rides.</p>
                      </div>
                    </div>

                    {message && (
                      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                        {message}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={createCommunityEventMutation.isPending}
                      className="mt-2 inline-flex min-h-[42px] items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {createCommunityEventMutation.isPending ? 'Creating...' : 'Create Event'}
                    </button>
                  </form>
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
