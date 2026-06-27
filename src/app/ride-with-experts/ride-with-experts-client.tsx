'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, Mountain, ShieldCheck, Star, Users, X } from 'lucide-react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchMyExpertRideProgramRequests,
  fetchExpertRidePrograms,
  requestExpertRideProgram,
  type RequestExpertRideProgramPayload,
} from '@/services/experts/experts.service';
import { getSportLabel } from '@/services/constants/sports';
import type { ExpertRideProgram, ExpertRideProgramRequest } from '@/types';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400';
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-600 dark:hover:bg-slate-800';
const cardClass =
  'border border-emerald-200/80 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-[#0f172a] dark:shadow-none';
const darkPanelClass =
  'dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type RideRequestFormValues = ReturnType<typeof createInitialForm>;

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

function getProgramTypeLabel(programType?: string | null) {
  switch (programType) {
    case 'training':
      return 'MTB training';
    case 'skills_clinic':
      return 'Skills clinic';
    case 'tour':
      return 'Local tour';
    default:
      return 'Guided ride';
  }
}

function getProgramTitle(program: ExpertRideProgram) {
  const expertName = getExpertName(program);
  const trailName = getTrailName(program);
  return program.title || `Ride with ${expertName} to ${trailName}`;
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
  const programAvailability = Array.isArray(program.availability_weekdays)
    ? program.availability_weekdays
    : [];
  const expertAvailability = Array.isArray(program.expert_availability_weekdays)
    ? program.expert_availability_weekdays
    : [];
  const availability =
    programAvailability.length > 0 ? programAvailability : expertAvailability;
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

function isActiveRequest(status?: ExpertRideProgramRequest['status']) {
  return status === 'pending' || status === 'accepted';
}

export default function RideWithExpertsClient() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const autoRequestHandledRef = useRef(false);
  const [requestProgram, setRequestProgram] = useState<ExpertRideProgram | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<RideRequestFormValues>({
    defaultValues: createInitialForm(),
  });
  const preferredDate = watch('preferredDate');

  const {
    data: programs = [],
    isLoading: loadingPrograms,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.experts.ridePrograms,
    queryFn: ({ signal }) => fetchExpertRidePrograms(signal),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: QUERY_KEYS.experts.myRideProgramRequests,
    queryFn: ({ signal }) => fetchMyExpertRideProgramRequests(signal),
    enabled: currentUser?.role === 'participant',
  });

  const requestByProgramId = useMemo(() => {
    const entries = myRequests
      .filter((request) => isActiveRequest(request.status))
      .map((request) => [request.program_id, request] as const);
    return new Map(entries);
  }, [myRequests]);

  const featuredProgram = programs[0];
  const remainingPrograms = useMemo(() => programs.slice(1), [programs]);
  const dateError = getDateError(requestProgram, preferredDate);
  const existingRequestForModal = requestProgram
    ? requestByProgramId.get(requestProgram.id)
    : undefined;

  const requestMutation = useMutation({
    mutationFn: ({ programId, payload }: { programId: string; payload: RequestExpertRideProgramPayload }) =>
      requestExpertRideProgram(programId, payload),
    onSuccess: async (data) => {
      setRequestMessage(
        data.updated
          ? 'Existing request updated. The expert can review the latest details.'
          : 'Request submitted. The expert can review it and coordinate the ride.'
      );
      setRequestProgram(null);
      reset(createInitialForm(currentUser?.phone));
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.experts.ridePrograms });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.experts.myRideProgramRequests });
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

    const existingRequest = requestByProgramId.get(program.id);
    reset(
      existingRequest
        ? {
            preferredDate: existingRequest.preferred_date?.slice(0, 10) || '',
            preferredTime: existingRequest.preferred_time || '',
            groupSize: String(existingRequest.group_size || 1),
            requesterPhone: existingRequest.requester_phone || currentUser.phone || '',
            offeredPriceNpr:
              existingRequest.offered_price_npr === null ||
              existingRequest.offered_price_npr === undefined
                ? ''
                : String(existingRequest.offered_price_npr),
            notes: existingRequest.notes || '',
          }
        : createInitialForm(currentUser.phone)
    );
    setRequestProgram(program);
  };

  useEffect(() => {
    if (autoRequestHandledRef.current) return;
    if (searchParams.get('request') !== 'random') return;
    if (loadingPrograms || loadingUser || !featuredProgram) return;

    autoRequestHandledRef.current = true;
    openRequest(featuredProgram);
  }, [featuredProgram, loadingPrograms, loadingUser, searchParams]);

  const submitRequest: SubmitHandler<RideRequestFormValues> = (values) => {
    if (!requestProgram || requestMutation.isPending) return;
    const error = getDateError(requestProgram, values.preferredDate);
    if (error) {
      setRequestMessage(error);
      return;
    }
    if (!values.preferredDate) {
      setRequestMessage('Please select a preferred date.');
      return;
    }

    requestMutation.mutate({
      programId: requestProgram.id,
      payload: {
        preferred_date: values.preferredDate,
        preferred_time: values.preferredTime || undefined,
        group_size: values.groupSize ? Number(values.groupSize) : 1,
        requester_phone: values.requesterPhone || undefined,
        offered_price_npr: values.offeredPriceNpr ? Number(values.offeredPriceNpr) : null,
        notes: values.notes || undefined,
      },
    });
  };

  return (
    <section className="container mx-auto space-y-6 px-4 py-6 md:py-8">
      <div className={`overflow-hidden rounded-[2rem] ${cardClass}`}>
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-5 md:p-7">
            <div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-200">
                Ride with experts
              </span>
              <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-gray-950 dark:text-white md:text-5xl">
                Choose an expert, pick a trail, request a ride.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-slate-300">
                These are flexible ride requests, not fixed events. Select a ride built from an
                expert&apos;s associated trails, share your preferred date, and coordinate once they accept.
              </p>
              {requestMessage && !requestProgram && (
                <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100">
                  {requestMessage}
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/experts" className={secondaryButtonClass}>
                Expert directory
              </Link>
              <Link href="/participants/me" className={primaryButtonClass}>
                My requests
              </Link>
            </div>
          </div>
          <div className="border-t border-emerald-100 bg-emerald-50/70 p-5 dark:border-slate-700 dark:bg-[#111827] md:p-7 lg:border-l lg:border-t-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-800 dark:text-emerald-300">
              How it works
            </p>
            <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-emerald-950 dark:text-slate-200">
              <p>1. Pick an expert ride based on trail and skill fit.</p>
              <p>2. Send your preferred date, time, group size, and notes.</p>
              <p>3. The expert accepts, declines, or responds with next steps.</p>
            </div>
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
          title="No expert rides are available yet."
          description="Expert ride requests will appear here after verified experts publish rides for trails they know well. For now, browse expert profiles or explore trails."
          ctaHref="/experts"
          ctaLabel="Browse experts"
        />
      ) : (
        <>
          {featuredProgram && (
            <FeaturedProgramCard
              program={featuredProgram}
              existingRequest={requestByProgramId.get(featuredProgram.id)}
              onRequest={() => openRequest(featuredProgram)}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {remainingPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                existingRequest={requestByProgramId.get(program.id)}
                onRequest={() => openRequest(program)}
              />
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-emerald-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#0f172a] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-black text-gray-950 dark:text-white">
                  {existingRequestForModal ? 'Update ride request' : 'Ride with a local'}
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
              <form onSubmit={handleSubmit(submitRequest)} className="mt-5 space-y-4">
                {existingRequestForModal && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100">
                    You already requested this ride. Changes here will update your existing request.
                  </div>
                )}
                <div className={`rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950 ${darkPanelClass}`}>
                  <p className="font-bold">Available dates</p>
                  <p className="mt-1 text-xs leading-5">
                    {requestProgram.availability_weekdays?.length
                      ? requestProgram.availability_weekdays.join(', ')
                      : requestProgram.expert_availability_weekdays?.length
                        ? requestProgram.expert_availability_weekdays.join(', ')
                      : 'Flexible. Select your preferred date and the expert will confirm.'}
                    {requestProgram.available_time_note ? ` · ${requestProgram.available_time_note}` : ''}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Preferred date
                    <input
                      type="date"
                      {...register('preferredDate', { required: true })}
                      required
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Preferred time
                    <input
                      type="time"
                      {...register('preferredTime')}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Group size
                    <input
                      type="number"
                      min={1}
                      max={requestProgram.max_group_size || 50}
                      {...register('groupSize')}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Phone
                    <input
                      {...register('requesterPhone')}
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
                    {...register('offeredPriceNpr')}
                    placeholder={requestProgram.price_npr ? `Suggested: NPR ${requestProgram.price_npr}` : 'Optional'}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Notes for the expert
                  <textarea
                    rows={4}
                    {...register('notes')}
                    placeholder="Skill level, bike type, pickup needs, or route expectations."
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                {(dateError || requestMessage) && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    {dateError || requestMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={requestMutation.isPending || Boolean(dateError)}
                  className={`${primaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {requestMutation.isPending
                    ? 'Submitting...'
                    : existingRequestForModal
                      ? 'Update request'
                      : 'Send ride request'}
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
  existingRequest,
  onRequest,
}: {
  program: ExpertRideProgram;
  existingRequest?: ExpertRideProgramRequest;
  onRequest: () => void;
}) {
  const expertName = getExpertName(program);
  const trailName = getTrailName(program);
  const title = getProgramTitle(program);

  return (
    <article className={`grid overflow-hidden rounded-[2rem] ${cardClass} lg:grid-cols-[0.7fr_1.3fr]`}>
      <div className="relative min-h-72 bg-emerald-950 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.18),transparent_36%),linear-gradient(135deg,rgba(6,78,59,0.92),rgba(15,23,42,0.98))]" />
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:bg-slate-800 dark:text-emerald-200">
            {getProgramTypeLabel(program.program_type)}
          </p>
          {existingRequest && <RequestStatusBadge request={existingRequest} />}
          {program.organization_name && program.organization_slug && (
            <Link
              href={`/organizations/${program.organization_slug}`}
              className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:border-slate-700 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              By {program.organization_name}
            </Link>
          )}
        </div>
        <h2 className="mt-4 text-3xl font-black leading-tight text-gray-950 dark:text-white md:text-5xl">
          {title}
        </h2>
        <p className="mt-4 line-clamp-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-slate-300">
          {program.description ||
            `${expertName} can guide a local ride on ${trailName} based on your preferred date, skill level, and route goals.`}
        </p>
        <ProgramMeta program={program} />
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onRequest} className={primaryButtonClass}>
            {existingRequest ? 'Update request' : 'Request program'}
          </button>
          {existingRequest && (
            <Link href="/participants/me" className={secondaryButtonClass}>
              View request
            </Link>
          )}
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

function ProgramCard({
  program,
  existingRequest,
  onRequest,
}: {
  program: ExpertRideProgram;
  existingRequest?: ExpertRideProgramRequest;
  onRequest: () => void;
}) {
  const expertName = getExpertName(program);
  const trailName = getTrailName(program);
  const title = getProgramTitle(program);

  return (
    <article className={`flex h-full flex-col rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:hover:border-emerald-700 ${cardClass}`}>
      <div className="flex items-center gap-3">
        <ProgramAvatar program={program} expertName={expertName} />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            {getProgramTypeLabel(program.program_type)}
          </p>
          <h3 className="text-lg font-black text-gray-950 dark:text-white">{expertName}</h3>
          {program.organization_name && (
            <p className="text-xs text-gray-500 dark:text-slate-400">With {program.organization_name}</p>
          )}
        </div>
      </div>

      <h4 className="mt-4 text-xl font-black leading-tight text-gray-950 dark:text-white">
        {title}
      </h4>
      {existingRequest && <RequestStatusBadge request={existingRequest} className="mt-3" />}
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
        {program.description || `${program.expert_city || 'Kathmandu'} ride support for ${trailName}.`}
      </p>
      <ProgramMeta program={program} compact />
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button type="button" onClick={onRequest} className={`${primaryButtonClass} flex-1`}>
          {existingRequest ? 'Update request' : 'Request program'}
        </button>
        {existingRequest && (
          <Link href="/participants/me" className={secondaryButtonClass}>
            Request
          </Link>
        )}
        <Link href={`/experts/${program.expert_user_id}`} className={secondaryButtonClass}>
          Profile
        </Link>
      </div>
    </article>
  );
}

function RequestStatusBadge({
  request,
  className = '',
}: {
  request: ExpertRideProgramRequest;
  className?: string;
}) {
  const date = request.preferred_date?.slice(0, 10);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    >
      <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white dark:bg-emerald-500 dark:text-white">
        Requested
      </span>
      <span className="capitalize">{request.status}</span>
      {date && <span>Preferred {date}</span>}
      {request.preferred_time && <span>{request.preferred_time}</span>}
    </div>
  );
}

function ProgramMeta({ program, compact = false }: { program: ExpertRideProgram; compact?: boolean }) {
  const availability = program.availability_weekdays?.length
    ? program.availability_weekdays.join(', ')
    : program.expert_availability_weekdays?.length
      ? program.expert_availability_weekdays.join(', ')
    : 'Flexible dates';

  return (
    <div className={`mt-5 grid gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-slate-300 sm:grid-cols-2`}>
      <p className={`flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold text-emerald-950 ${darkPanelClass}`}>
        <MapPin className="h-4 w-4" />
        {program.trail_location || program.expert_city || 'Kathmandu'}
      </p>
      <p className={`flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold text-emerald-950 ${darkPanelClass}`}>
        <Mountain className="h-4 w-4" />
        {program.trail_sport_type ? getSportLabel(program.trail_sport_type) : 'MTB ride'}
      </p>
      <p className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 ${darkPanelClass}`}>
        <Star className="h-4 w-4" />
        {program.review_count ? `${program.average_rating?.toFixed(1) || '5.0'} rating` : 'New host'}
      </p>
      <p className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 ${darkPanelClass}`}>
        <CalendarDays className="h-4 w-4" />
        {program.available_time_note ? `${availability} · ${program.available_time_note}` : availability}
      </p>
      <p className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 ${darkPanelClass}`}>
        <Users className="h-4 w-4" />
        Up to {program.max_group_size || 1} rider{program.max_group_size === 1 ? '' : 's'}
      </p>
      <p className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 ${darkPanelClass}`}>
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
      className={`${sizeClass} overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-100 font-black text-emerald-900 shadow-sm dark:border-slate-600 dark:bg-[#111827] dark:text-emerald-100`}
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
      <div className="h-96 animate-pulse rounded-[2rem] border border-emerald-100 bg-white/70 dark:border-slate-700 dark:bg-[#0f172a]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-3xl border border-emerald-100 bg-white/70 dark:border-slate-700 dark:bg-[#0f172a]"
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
    <div className="rounded-3xl border border-dashed border-emerald-300 bg-white/90 p-8 text-center shadow-sm dark:border-slate-700 dark:bg-[#0f172a] dark:shadow-none">
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
