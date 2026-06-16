'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, Mountain, ShieldCheck, Star, Users, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchExpertRidePrograms,
  requestExpertRideProgram,
  type RequestExpertRideProgramPayload,
} from '@/services/experts/experts.service';
import { getSportLabel } from '@/services/constants/sports';
import type { ExpertRideProgram } from '@/types';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300';
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-700/70 dark:bg-slate-950/70 dark:text-emerald-100 dark:hover:bg-emerald-950/45';
const cardClass =
  'border border-emerald-200/80 bg-white/92 shadow-sm dark:border-emerald-900/60 dark:bg-slate-950/72';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'LX'
  );
}

function getExpertName(program: ExpertRideProgram) {
  return program.expert_name || program.expert_email?.split('@')[0] || 'Local expert';
}

function getTrailName(program: ExpertRideProgram) {
  return program.trail_name || 'selected trail';
}

function getRequestedWeekday(date: string) {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return WEEKDAYS[parsed.getDay()];
}

function getDateError(program: ExpertRideProgram | null, preferredDate: string) {
  if (!program || !preferredDate) return '';
  const requestedWeekday = getRequestedWeekday(preferredDate);
  if (!requestedWeekday) return 'Select a valid date.';
  const availability = Array.isArray(program.expert_availability_weekdays)
    ? program.expert_availability_weekdays
    : [];
  if (availability.length > 0 && !availability.includes(requestedWeekday)) {
    return `${getExpertName(program)} is marked available on ${availability.join(', ')}.`;
  }
  return '';
}

function createInitialForm(currentUserPhone?: string | null) {
  return {
    preferredDate: '',
    preferredTime: '',
    groupSize: '1',
    requesterPhone: currentUserPhone || '',
    offeredPriceNpr: '',
    notes: '',
  };
}

export default function RideWithExpertsClient() {
  const queryClient = useQueryClient();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const [requestProgram, setRequestProgram] = useState<ExpertRideProgram | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [form, setForm] = useState(createInitialForm());

  const {
    data: programs = [],
    isLoading: loadingPrograms,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.experts.ridePrograms,
    queryFn: ({ signal }) => fetchExpertRidePrograms(signal),
  });

  const featuredProgram = programs[0];
  const remainingPrograms = useMemo(() => programs.slice(1), [programs]);
  const dateError = getDateError(requestProgram, form.preferredDate);

  const requestMutation = useMutation({
    mutationFn: ({ programId, payload }: { programId: string; payload: RequestExpertRideProgramPayload }) =>
      requestExpertRideProgram(programId, payload),
    onSuccess: async () => {
      setRequestMessage('Request submitted. The expert can review it and coordinate the ride.');
      setRequestProgram(null);
      setForm(createInitialForm(currentUser?.phone));
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.experts.ridePrograms });
    },
    onError: (error) => {
      setRequestMessage(error instanceof Error ? error.message : 'Failed to submit request.');
    },
  });

  const openRequest = (program: ExpertRideProgram) => {
    setRequestMessage('');

    if (loadingUser) {
      setRequestMessage('Checking your account. Please try again in a second.');
      return;
    }

    if (!currentUser) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/ride-with-experts';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: {
            message: `Create a participant account to request ${program.title}.`,
            next,
          },
        })
      );
      return;
    }

    if (currentUser.role !== 'participant') {
      setRequestMessage('Ride requests are available for participants only.');
      return;
    }

    setForm(createInitialForm(currentUser.phone));
    setRequestProgram(program);
  };

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestProgram || requestMutation.isPending) return;
    const error = getDateError(requestProgram, form.preferredDate);
    if (error) {
      setRequestMessage(error);
      return;
    }
    if (!form.preferredDate) {
      setRequestMessage('Please select a preferred date.');
      return;
    }

    requestMutation.mutate({
      programId: requestProgram.id,
      payload: {
        preferred_date: form.preferredDate,
        preferred_time: form.preferredTime || undefined,
        group_size: form.groupSize ? Number(form.groupSize) : 1,
        requester_phone: form.requesterPhone || undefined,
        offered_price_npr: form.offeredPriceNpr ? Number(form.offeredPriceNpr) : null,
        notes: form.notes || undefined,
      },
    });
  };

  return (
    <section className="container mx-auto space-y-6 px-4 py-8 md:py-10">
      <div className={`rounded-[2rem] ${cardClass} p-5 backdrop-blur md:p-7`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-100">
              Ride with experts
            </span>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-gray-950 dark:text-white md:text-5xl">
              Request a guided ride on expert-selected trails.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-slate-300">
              Each ride is created by a verified expert from trails they have associated with their profile.
              Pick the ride, choose a preferred date, then coordinate after the expert accepts.
            </p>
            {requestMessage && !requestProgram && (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100">
                {requestMessage}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/experts" className={secondaryButtonClass}>
              Expert directory
            </Link>
            <Link href="/events?upcoming=true" className={primaryButtonClass}>
              Scheduled rides
            </Link>
          </div>
        </div>
      </div>

      {loadingPrograms ? (
        <RideWithExpertsSkeleton />
      ) : isError ? (
        <EmptyState
          title="Ride programs could not load."
          description="Try the expert directory while we reload this request surface."
          ctaHref="/experts"
          ctaLabel="Browse experts"
        />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No expert ride programs are live yet."
          description="Verified experts can create ride programs from trails associated with their profiles."
          ctaHref="/experts/join"
          ctaLabel="Apply as expert"
        />
      ) : (
        <>
          {featuredProgram && (
            <FeaturedProgramCard program={featuredProgram} onRequest={() => openRequest(featuredProgram)} />
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {remainingPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} onRequest={() => openRequest(program)} />
            ))}
          </div>
        </>
      )}

      <Dialog.Root
        open={Boolean(requestProgram)}
        onOpenChange={(open) => {
          if (!open) {
            setRequestProgram(null);
            setRequestMessage('');
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xl dark:border-emerald-900/70 dark:bg-slate-950 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-black text-gray-950 dark:text-white">
                  Request this ride
                </Dialog.Title>
                {requestProgram && (
                  <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    {requestProgram.title}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {requestProgram && (
              <form onSubmit={submitRequest} className="mt-5 space-y-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <p className="font-bold">Available dates</p>
                  <p className="mt-1 text-xs leading-5">
                    {requestProgram.expert_availability_weekdays?.length
                      ? requestProgram.expert_availability_weekdays.join(', ')
                      : 'Flexible. Select your preferred date and the expert will confirm.'}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Preferred date
                    <input
                      type="date"
                      value={form.preferredDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, preferredDate: event.target.value }))
                      }
                      required
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Preferred time
                    <input
                      type="time"
                      value={form.preferredTime}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, preferredTime: event.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Group size
                    <input
                      type="number"
                      min={1}
                      max={requestProgram.max_group_size || 50}
                      value={form.groupSize}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, groupSize: event.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Phone
                    <input
                      value={form.requesterPhone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, requesterPhone: event.target.value }))
                      }
                      placeholder="Optional"
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Offered amount in NPR
                  <input
                    type="number"
                    min={0}
                    value={form.offeredPriceNpr}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, offeredPriceNpr: event.target.value }))
                    }
                    placeholder={requestProgram.price_npr ? `Suggested: NPR ${requestProgram.price_npr}` : 'Optional'}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Notes for the expert
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Skill level, bike type, pickup needs, or route expectations."
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                {(dateError || requestMessage) && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
                    {dateError || requestMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={requestMutation.isPending || Boolean(dateError)}
                  className={`${primaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {requestMutation.isPending ? 'Submitting...' : 'Send request'}
                </button>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function FeaturedProgramCard({
  program,
  onRequest,
}: {
  program: ExpertRideProgram;
  onRequest: () => void;
}) {
  const expertName = getExpertName(program);
  const trailName = getTrailName(program);

  return (
    <article className={`grid overflow-hidden rounded-[2rem] ${cardClass} lg:grid-cols-[0.78fr_1.22fr]`}>
      <div className="relative min-h-72 bg-emerald-950 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.22),transparent_36%),linear-gradient(135deg,rgba(6,78,59,0.94),rgba(2,6,23,0.98))]" />
        {program.trail_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={program.trail_image_url}
            alt={trailName}
            className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
          />
        )}
        <div className="relative flex h-full flex-col justify-between">
          <ProgramAvatar program={program} expertName={expertName} size="large" />
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/30 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-50">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified expert offer
            </span>
            <p className="mt-3 text-sm font-semibold text-emerald-50/75">
              {program.expert_city || 'Kathmandu'} based expert
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
          Featured ride
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-gray-950 dark:text-white md:text-5xl">
          Ride with {expertName} to {trailName}
        </h2>
        <p className="mt-4 line-clamp-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-slate-300">
          {program.description ||
            `${expertName} can guide a local ride on ${trailName} based on your preferred date, skill level, and route goals.`}
        </p>
        <ProgramMeta program={program} />
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onRequest} className={primaryButtonClass}>
            Request this ride
          </button>
          <Link href={`/experts/${program.expert_user_id}`} className={secondaryButtonClass}>
            View expert
          </Link>
          {program.trail_slug && (
            <Link href={`/trails/${program.trail_slug}`} className={secondaryButtonClass}>
              View trail
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function ProgramCard({ program, onRequest }: { program: ExpertRideProgram; onRequest: () => void }) {
  const expertName = getExpertName(program);
  const trailName = getTrailName(program);

  return (
    <article className={`flex h-full flex-col rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700/70 ${cardClass}`}>
      <div className="flex items-center gap-3">
        <ProgramAvatar program={program} expertName={expertName} />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Ride with
          </p>
          <h3 className="text-lg font-black text-gray-950 dark:text-white">{expertName}</h3>
        </div>
      </div>

      <h4 className="mt-4 text-xl font-black leading-tight text-gray-950 dark:text-white">
        {trailName}
      </h4>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
        {program.description || `${program.expert_city || 'Kathmandu'} ride support for ${trailName}.`}
      </p>
      <ProgramMeta program={program} compact />
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button type="button" onClick={onRequest} className={`${primaryButtonClass} flex-1`}>
          Request ride
        </button>
        <Link href={`/experts/${program.expert_user_id}`} className={secondaryButtonClass}>
          Expert
        </Link>
      </div>
    </article>
  );
}

function ProgramMeta({ program, compact = false }: { program: ExpertRideProgram; compact?: boolean }) {
  const availability = program.expert_availability_weekdays?.length
    ? program.expert_availability_weekdays.join(', ')
    : 'Flexible dates';

  return (
    <div className={`mt-5 grid gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-slate-300 sm:grid-cols-2`}>
      <p className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        <MapPin className="h-4 w-4" />
        {program.trail_location || program.expert_city || 'Kathmandu'}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 font-semibold text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/25 dark:text-teal-100">
        <Mountain className="h-4 w-4" />
        {program.trail_sport_type ? getSportLabel(program.trail_sport_type) : 'MTB ride'}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
        <Star className="h-4 w-4" />
        {program.review_count ? `${program.average_rating?.toFixed(1) || '5.0'} rating` : 'New host'}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-100">
        <CalendarDays className="h-4 w-4" />
        {availability}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-lime-100 bg-lime-50 px-3 py-2 font-semibold text-lime-900 dark:border-lime-900/50 dark:bg-lime-950/20 dark:text-lime-100">
        <Users className="h-4 w-4" />
        Up to {program.max_group_size || 1} rider{program.max_group_size === 1 ? '' : 's'}
      </p>
      <p className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
        <Clock className="h-4 w-4" />
        {program.duration_note || (program.price_npr ? `NPR ${program.price_npr}` : program.skill_level)}
      </p>
    </div>
  );
}

function ProgramAvatar({
  program,
  expertName,
  size = 'normal',
}: {
  program: ExpertRideProgram;
  expertName: string;
  size?: 'normal' | 'large';
}) {
  const sizeClass = size === 'large' ? 'h-24 w-24 text-2xl' : 'h-14 w-14 text-sm';

  return (
    <div
      className={`${sizeClass} overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-100 font-black text-emerald-900 shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/70 dark:text-emerald-100`}
    >
      {program.expert_profile_photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={program.expert_profile_photo_url} alt={expertName} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{getInitials(expertName)}</div>
      )}
    </div>
  );
}

function RideWithExpertsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-96 animate-pulse rounded-[2rem] border border-emerald-100 bg-white/70 dark:border-emerald-900/60 dark:bg-slate-950/70" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-3xl border border-emerald-100 bg-white/70 dark:border-emerald-900/60 dark:bg-slate-950/70"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-emerald-300 bg-white/85 p-8 text-center shadow-sm dark:border-emerald-800/70 dark:bg-slate-950/75">
      <h3 className="text-xl font-black text-gray-950 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600 dark:text-slate-300">
        {description}
      </p>
      <Link href={ctaHref} className={`mt-5 ${primaryButtonClass}`}>
        {ctaLabel}
      </Link>
    </div>
  );
}
