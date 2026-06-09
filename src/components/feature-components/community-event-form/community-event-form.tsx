'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEvent, updateEvent } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type { CreateEventInput, Event, ExpertiseLevel, SportType, Trail } from '@/types';
import TrailAutocomplete from '@/components/ui/trail-autocomplete';
import { COMMUNITY_NAME } from '@/lib/branding';
import { useTrailAutocompleteOptions } from '@/hooks/use-trail-autocomplete-options';

export type CommunityPeriod =
  | 'weekly'
  | 'biweekly_long_ride'
  | 'midweek_endurance_trail'
  | 'quarterly_training';

export const COMMUNITY_PERIOD_OPTIONS: Array<{
  value: CommunityPeriod;
  label: string;
  helper: string;
}> = [
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

export function getDefaultDateForPeriod(period: CommunityPeriod) {
  const now = new Date();
  const next = new Date(now);
  const day = now.getDay();

  if (period === 'midweek_endurance_trail') {
    const daysUntilWednesday = (3 - day + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntilWednesday);
    next.setHours(6, 0, 0, 0);
    return toDateTimeLocal(next);
  }

  if (period === 'quarterly_training') {
    const month = now.getMonth();
    const nextQuarterMonth = month < 3 ? 3 : month < 6 ? 6 : month < 9 ? 9 : 0;
    const year = month < 9 ? now.getFullYear() : now.getFullYear() + 1;
    next.setFullYear(year, nextQuarterMonth, 1);
    while (next.getDay() !== 6) next.setDate(next.getDate() + 1);
    next.setHours(6, 30, 0, 0);
    return toDateTimeLocal(next);
  }

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

function toLocalInputDateTime(value?: string | null) {
  if (!value) return getDefaultDateForPeriod('weekly');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return getDefaultDateForPeriod('weekly');
  return toDateTimeLocal(parsed);
}

function inferPeriod(event?: Event | null): CommunityPeriod {
  const text = `${event?.title || ''} ${event?.description || ''}`.toLowerCase();
  if (event?.sport_type === 'training' || text.includes('training')) return 'quarterly_training';
  if (text.includes('midweek') || text.includes('endurance')) return 'midweek_endurance_trail';
  if (text.includes('biweekly') || text.includes('long ride')) return 'biweekly_long_ride';
  return 'weekly';
}

type CommunityEventFormProps = {
  mode?: 'create' | 'edit';
  event?: Event | null;
  onCompleted?: (eventId: string) => void | Promise<void>;
  onCancel?: () => void;
};

export default function CommunityEventForm({
  mode = 'create',
  event,
  onCompleted,
  onCancel,
}: CommunityEventFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = mode === 'edit';
  const initialPeriod = useMemo(() => inferPeriod(event), [event]);
  const [period, setPeriod] = useState<CommunityPeriod>(initialPeriod);
  const [trailSearch, setTrailSearch] = useState(event?.trail?.name || '');
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(event?.trail || null);
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [trailAlert, setTrailAlert] = useState(event?.trail_alert || '');
  const [eventDate, setEventDate] = useState(toLocalInputDateTime(event?.event_date));
  const [requiredExpertise, setRequiredExpertise] = useState<ExpertiseLevel>(
    event?.required_expertise || 'intermediate'
  );
  const [maxParticipants, setMaxParticipants] = useState(event?.max_participants || 20);
  const [meetingPoint, setMeetingPoint] = useState(event?.meeting_point || '');
  const [priceNpr, setPriceNpr] = useState(Number(event?.price_npr || 0));
  const [message, setMessage] = useState<string | null>(null);
  const isQuarterlyTraining = period === 'quarterly_training';

  const { data: trailOptions = [], isFetching: searchingTrails } = useTrailAutocompleteOptions({
    query: trailSearch,
    enabled: !isQuarterlyTraining,
  });

  useEffect(() => {
    if (isEditMode) return;
    setEventDate(getDefaultDateForPeriod(period));
    if (period === 'quarterly_training') {
      setSelectedTrail(null);
      setTrailSearch('');
      setTitle(getPeriodTitle('quarterly_training'));
      setDescription(getPeriodDescription('quarterly_training', undefined));
      setTrailAlert('');
      setMeetingPoint('');
    }
  }, [isEditMode, period]);

  useEffect(() => {
    if (period === 'quarterly_training') return;
    if (!selectedTrail) return;
    if (!isEditMode) {
      setTitle(getPeriodTitle(period, selectedTrail.name));
      setDescription(getPeriodDescription(period, selectedTrail));
      setMeetingPoint(selectedTrail.location || '');
      return;
    }
    setTitle((current) => current || getPeriodTitle(period, selectedTrail.name));
    setDescription((current) => current || getPeriodDescription(period, selectedTrail));
    setMeetingPoint((current) => current || selectedTrail.location || '');
  }, [isEditMode, period, selectedTrail]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isQuarterlyTraining && !selectedTrail) {
        throw new Error('Please select a trail.');
      }
      if (!title.trim()) {
        throw new Error('Please add an event title.');
      }
      if (!description.trim()) {
        throw new Error('Please add an event description.');
      }
      if (!meetingPoint.trim()) {
        throw new Error('Please set a meeting point.');
      }

      const payload: CreateEventInput = {
        title: title.trim(),
        description: description.trim(),
        trail_alert: trailAlert.trim() || (isEditMode ? null : undefined),
        trail_id: isQuarterlyTraining ? null : selectedTrail?.id,
        event_date: new Date(eventDate).toISOString(),
        organizer_name: COMMUNITY_NAME,
        organizer_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || '',
        max_participants: Math.max(1, Number(maxParticipants) || 1),
        meeting_point: meetingPoint.trim(),
        difficulty: isQuarterlyTraining ? null : selectedTrail?.difficulty,
        required_expertise: requiredExpertise,
        sport_type:
          isQuarterlyTraining
            ? ('training' as SportType)
            : (selectedTrail?.sport_type as SportType) || ('mtb' as SportType),
        city: isQuarterlyTraining ? 'Kathmandu, Nepal' : selectedTrail?.location || 'Kathmandu, Nepal',
        price_npr: Math.max(0, Number(priceNpr) || 0),
        host_user_id: event?.host_user_id || undefined,
      };

      if (isEditMode && event?.id) {
        return updateEvent(event.id, payload);
      }
      return createEvent(payload);
    },
    onSuccess: async (savedEvent) => {
      setMessage(isEditMode ? 'Community event updated.' : 'Community event created.');
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.byId(savedEvent.id) });
      await onCompleted?.(savedEvent.id);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to save community event.');
    },
  });

  return (
    <form
      className="mt-5 grid gap-3"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        setMessage(null);
        saveMutation.mutate();
      }}
    >
      <div>
        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
          Event period
        </label>
        <select
          value={period}
          onChange={(changeEvent) => setPeriod(changeEvent.target.value as CommunityPeriod)}
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
        <TrailAutocomplete
          required
          label="Trail"
          query={trailSearch}
          value={selectedTrail}
          options={trailOptions}
          isLoading={searchingTrails}
          helperText="Selecting a trail auto-fills title, route description, sport, difficulty, and meeting point."
          onQueryChange={setTrailSearch}
          onChange={setSelectedTrail}
        />
      )}

      <div>
        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Event title</label>
        <input
          required
          value={title}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Description</label>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
          Trail alert / participant notice
        </label>
        <textarea
          rows={3}
          value={trailAlert}
          onChange={(changeEvent) => setTrailAlert(changeEvent.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="Temporary trail condition, safety note, or ride-day instruction."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Date & time</label>
          <input
            required
            type="datetime-local"
            value={eventDate}
            onChange={(changeEvent) => setEventDate(changeEvent.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Expertise</label>
          <select
            value={requiredExpertise}
            onChange={(changeEvent) => setRequiredExpertise(changeEvent.target.value as ExpertiseLevel)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Max participants</label>
          <input
            min={1}
            type="number"
            value={maxParticipants}
            onChange={(changeEvent) => setMaxParticipants(Number(changeEvent.target.value) || 1)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Meeting point</label>
          <input
            required
            value={meetingPoint}
            onChange={(changeEvent) => setMeetingPoint(changeEvent.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Google Maps friendly location"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">Price (NPR)</label>
          <input
            min={0}
            type="number"
            value={priceNpr}
            onChange={(changeEvent) => setPriceNpr(Math.max(0, Number(changeEvent.target.value) || 0))}
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

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-lime-300 dark:text-green-950 dark:hover:bg-lime-200"
        >
          {saveMutation.isPending
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
              ? 'Save Community Event'
              : 'Create Event'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-300 px-5 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
