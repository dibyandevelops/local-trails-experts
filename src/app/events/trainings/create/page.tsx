'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { createEvent } from '@/services/events/events.service';
import { fetchExperts } from '@/services/experts/experts.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { CreateEventInput, ExpertiseLevel, SportType, User } from '@/types';

type TrainingFormValues = {
  title: string;
  training_focus: string;
  venue: string;
  event_date: string;
  required_expertise: ExpertiseLevel;
  city: string;
  max_participants: number;
  is_paid_event: boolean;
  price_npr: number;
  organizer_name: string;
  organizer_email: string;
  host_user_id: string;
  acceptTerms: boolean;
};

const defaultValues: TrainingFormValues = {
  title: '',
  training_focus: '',
  venue: '',
  event_date: '',
  required_expertise: 'beginner',
  city: '',
  max_participants: 20,
  is_paid_event: false,
  price_npr: 0,
  organizer_name: '',
  organizer_email: '',
  host_user_id: '',
  acceptTerms: false,
};

const labelClass = 'mb-2 block text-sm font-semibold text-gray-800 dark:text-slate-100';
const inputClass =
  'w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900 dark:disabled:text-slate-400';

function getUpcomingWeekendDateTimeLocal() {
  const now = new Date();
  const day = now.getDay();
  let daysUntilSaturday = (6 - day + 7) % 7;
  if (daysUntilSaturday === 0) daysUntilSaturday = 7;
  const weekend = new Date(now);
  weekend.setDate(now.getDate() + daysUntilSaturday);
  weekend.setHours(6, 30, 0, 0);
  const year = weekend.getFullYear();
  const month = String(weekend.getMonth() + 1).padStart(2, '0');
  const date = String(weekend.getDate()).padStart(2, '0');
  const hours = String(weekend.getHours()).padStart(2, '0');
  const minutes = String(weekend.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${minutes}`;
}

export default function CreateTrainingPage() {
  const router = useRouter();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.list(),
    queryFn: ({ signal }) => fetchExperts({}, signal),
    enabled: currentUser?.role === 'admin',
  });

  const { register, handleSubmit, watch, setValue, getValues } =
    useForm<TrainingFormValues>({
      defaultValues,
    });

  const selectedHostId = watch('host_user_id');
  const isPaidEvent = watch('is_paid_event');
  const isExpertUnverified =
    currentUser?.role === 'expert' && !currentUser?.is_verified_expert;

  useEffect(() => {
    if (!getValues('event_date')) {
      setValue('event_date', getUpcomingWeekendDateTimeLocal());
    }
  }, [getValues, setValue]);

  useEffect(() => {
    if (currentUser?.role !== 'expert') return;
    setValue('host_user_id', currentUser.id);
    setValue('organizer_name', currentUser.name || '');
    setValue('organizer_email', currentUser.email || '');
  }, [currentUser, setValue]);

  const selectedExpert = selectedHostId
    ? experts.find((expert) => expert.id === selectedHostId)
    : undefined;
  const selectedHostIsVerified = selectedExpert?.is_verified_expert ?? false;

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    setValue('organizer_name', selectedExpert?.name || '');
    setValue('organizer_email', selectedExpert?.email || '');
  }, [currentUser, selectedExpert, setValue]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateEventInput) => createEvent(payload),
  });

  const onSubmit: SubmitHandler<TrainingFormValues> = async (values) => {
    try {
      if (isExpertUnverified) {
        alert('Your expert profile is pending verification. You cannot create trainings yet.');
        return;
      }
      if (currentUser?.role === 'admin' && !values.host_user_id) {
        alert('Please select an approved expert host.');
        return;
      }
      if (currentUser?.role === 'admin' && values.host_user_id && !selectedHostIsVerified) {
        alert('Selected expert is not verified yet. Please choose a verified host.');
        return;
      }
      if (values.is_paid_event && (!values.price_npr || values.price_npr <= 0)) {
        alert('Paid training must have a price greater than 0.');
        return;
      }

      const payload: CreateEventInput = {
        title: values.title.trim(),
        description: [
          `Training venue: ${values.venue.trim()}`,
          values.training_focus.trim(),
        ]
          .filter(Boolean)
          .join('\n\n'),
        trail_id: undefined,
        sport_type: 'training' as SportType,
        event_date: values.event_date,
        organizer_name: values.organizer_name || undefined,
        organizer_email: values.organizer_email || undefined,
        max_participants: values.max_participants || undefined,
        meeting_point: values.venue || undefined,
        required_expertise: values.required_expertise,
        city: values.city || undefined,
        price_npr: values.is_paid_event ? values.price_npr ?? 0 : 0,
        host_user_id: values.host_user_id || undefined,
      };

      await createMutation.mutateAsync(payload);
      alert('Training created successfully!');
      router.push('/events');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create training');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-6 shadow-sm dark:border-emerald-800/60 dark:from-slate-950 dark:via-emerald-950/35 dark:to-lime-950/20 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-400/10" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Trainings
            </span>
            <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Coaching
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-950 dark:text-slate-50 sm:text-4xl">
            Organize Training
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
            Plan focused coaching sessions and skill blocks led by trusted local experts.
          </p>
        </div>
      </section>

      {loadingUser ? (
        <div className="rounded-3xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">Loading...</div>
      ) : !currentUser ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200">
          Unable to load user session. Please login again.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/15 dark:to-slate-900 sm:p-6"
        >
          {isExpertUnverified && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
              Your expert profile is pending verification. Trainings are disabled until
              an admin approves your profile.
            </div>
          )}
          {currentUser.role === 'admin' && (
            <div>
              <label className={labelClass}>Approved Expert Host</label>
              <select
                {...register('host_user_id')}
                required
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setValue('host_user_id', selectedId);
                  const expert = experts.find((item) => item.id === selectedId);
                  setValue('organizer_name', expert?.name || '');
                  setValue('organizer_email', expert?.email || '');
                }}
                className={inputClass}
              >
                <option value="">Select expert host</option>
                {experts.map((expert) => (
                  <option
                    key={expert.id}
                    value={expert.id}
                    disabled={!expert.is_verified_expert}
                  >
                    {expert.name || 'Expert'} ({expert.email})
                    {!expert.is_verified_expert ? ' — Pending verification' : ''}
                  </option>
                ))}
              </select>
              {selectedHostId && !selectedHostIsVerified && (
                <p className="mt-2 text-xs text-amber-700">
                  This expert is pending verification and cannot host trainings yet.
                </p>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>
              Training Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('title', { required: true })}
              placeholder="e.g., MTB Cornering + Braking Fundamentals"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Venue / Location <span className="text-red-500">*</span>
            </label>
              <input
                type="text"
                {...register('venue', { required: true })}
                placeholder="e.g., Riverside Park Trailhead"
                className={inputClass}
              />
          </div>

          <div>
            <label className={labelClass}>Training Focus</label>
            <textarea
              {...register('training_focus')}
              rows={4}
              placeholder="What will participants learn in this session?"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('event_date', { required: true })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Required Expertise</label>
              <select
                {...register('required_expertise', { required: true })}
                className={inputClass}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                {...register('city')}
                className={inputClass}
                placeholder="e.g., your city in Nepal"
              />
            </div>
            <div>
              <label className={labelClass}>Max Participants</label>
              <input
                type="number"
                min="1"
                {...register('max_participants', {
                  setValueAs: (value) => (value === '' ? 20 : Number(value)),
                })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Pricing</label>
            <div className="flex items-center gap-2">
              <input id="training-paid" type="checkbox" {...register('is_paid_event')} />
              <label htmlFor="training-paid" className="text-sm text-gray-700 dark:text-slate-200">
                Paid training
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Price (NPR)</label>
            <input
              type="number"
              min="0"
              disabled={!isPaidEvent}
              {...register('price_npr', {
                setValueAs: (value) => (value === '' ? 0 : Number(value)),
              })}
              className={inputClass}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">0 = free</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Organizer Name</label>
              <input
                type="text"
                {...register('organizer_name')}
                readOnly
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Organizer Email</label>
              <input
                type="email"
                {...register('organizer_email')}
                readOnly
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
            <input
              id="training-accept-terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              {...register('acceptTerms', {
                required: 'Please accept the terms and privacy policy.',
              })}
            />
            <label htmlFor="training-accept-terms" className="text-xs leading-5">
              I agree to the{' '}
              <a href="/terms" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                Privacy Policy
              </a>
              .
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                isExpertUnverified ||
                (currentUser?.role === 'admin' &&
                  Boolean(selectedHostId) &&
                  !selectedHostIsVerified)
              }
              className="flex-1 rounded-2xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Training'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/events/create')}
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Event Form
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
