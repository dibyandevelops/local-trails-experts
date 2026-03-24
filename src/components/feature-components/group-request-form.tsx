'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import type { Trail, User } from '@/types';
import { fetchTrailsPaginated } from '@/services/trails/trails.service';

type GroupRequestValues = {
  name: string;
  email: string;
  phone: string;
  groupSize?: number;
  preferredDate?: string;
  message: string;
};

type TrailOption = Pick<Trail, 'id' | 'name' | 'location' | 'sport_type'>;

export default function GroupRequestForm({
  initialUser,
  initialTrail,
  onSent,
}: {
  initialUser?: User | null;
  initialTrail?: TrailOption | null;
  onSent?: () => void;
}) {
  const [selectedTrail, setSelectedTrail] = useState<TrailOption | null>(
    initialTrail || null
  );
  const [trailQuery, setTrailQuery] = useState('');
  const [status, setStatus] = useState<
    { type: 'idle' } | { type: 'sending' } | { type: 'sent' } | { type: 'error'; message: string }
  >({ type: 'idle' });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GroupRequestValues>({
    defaultValues: {
      name: initialUser?.name || '',
      email: initialUser?.email || '',
      phone: initialUser?.phone || '',
      groupSize: undefined,
      preferredDate: '',
      message:
        'Hi LocoXperts team,\n\nWe’d like to organize a large group activity.\n\nDetails:\n- Group profile (beginner/intermediate/advanced):\n- Expected pace:\n- Logistics (transport / start time):\n- Any special request:\n\nThanks!\n',
    },
  });

  useEffect(() => {
    if (initialUser?.name) setValue('name', initialUser.name);
    if (initialUser?.email) setValue('email', initialUser.email);
    if (initialUser?.phone) setValue('phone', initialUser.phone);
  }, [initialUser, setValue]);

  const searchEnabled = trailQuery.trim().length >= 2;
  const { data: trailSearch = [], isFetching } = useQuery({
    queryKey: ['trail-search', trailQuery.trim()],
    queryFn: async ({ signal }) => {
      const result = await fetchTrailsPaginated(
        { search: trailQuery.trim(), page: 1, pageSize: 10, sort: 'name_asc' },
        signal
      );
      return (result.trails || []).map((t: Trail) => ({
        id: t.id,
        name: t.name,
        location: t.location,
        sport_type: t.sport_type,
      })) as TrailOption[];
    },
    enabled: searchEnabled,
    staleTime: 10_000,
  });

  const options = useMemo(() => {
    const deduped = new Map<string, TrailOption>();
    (selectedTrail ? [selectedTrail] : []).forEach((t) => deduped.set(t.id, t));
    trailSearch.forEach((t) => deduped.set(t.id, t));
    return Array.from(deduped.values());
  }, [selectedTrail, trailSearch]);

  const onSubmit = handleSubmit(async (values) => {
    setStatus({ type: 'sending' });
    try {
      const response = await fetch('/api/contact/group-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...values,
          trailId: selectedTrail?.id || '',
          trailName: selectedTrail?.name || '',
          trailLocation: selectedTrail?.location || '',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to send');
      }
      setStatus({ type: 'sent' });
      onSent?.();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send request',
      });
    }
  });

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-emerald-400';
  const labelClass = 'mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200';

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label className={labelClass} htmlFor="group-trail-search">
          Choose a trail (search)
        </label>
        <input
          id="group-trail-search"
          className={inputClass}
          value={trailQuery}
          onChange={(event) => setTrailQuery(event.target.value)}
          placeholder="Type at least 2 characters…"
          aria-describedby="group-trail-help"
        />
        <p id="group-trail-help" className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Search any trail on the platform and select one (optional).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.slice(0, 10).map((trail) => (
            <button
              key={trail.id}
              type="button"
              onClick={() => setSelectedTrail(trail)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selectedTrail?.id === trail.id
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900'
              }`}
              aria-pressed={selectedTrail?.id === trail.id}
            >
              {trail.name}
              <span className="ml-2 font-normal text-gray-500 dark:text-slate-400">
                {trail.location}
              </span>
            </button>
          ))}
          {isFetching && (
            <span className="text-xs text-gray-500 dark:text-slate-400">Searching…</span>
          )}
        </div>
        {selectedTrail && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Selected: <span className="font-semibold">{selectedTrail.name}</span>{' '}
            <span className="text-emerald-800/80 dark:text-emerald-100/80">
              ({selectedTrail.location})
            </span>
            <button
              type="button"
              onClick={() => setSelectedTrail(null)}
              className="ml-3 text-xs font-semibold underline underline-offset-2"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="group-name">
            Name
          </label>
          <input
            id="group-name"
            className={inputClass}
            placeholder="Your name"
            {...register('name', { required: 'Name is required' })}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="group-email">
            Email
          </label>
          <input
            id="group-email"
            className={inputClass}
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email',
              },
            })}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="group-phone">
            Phone (optional)
          </label>
          <input id="group-phone" className={inputClass} {...register('phone')} />
        </div>
        <div>
          <label className={labelClass} htmlFor="group-size">
            Group size (optional)
          </label>
          <input
            id="group-size"
            className={inputClass}
            type="number"
            min={1}
            max={500}
            {...register('groupSize', { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="group-date">
            Preferred date (optional)
          </label>
          <input id="group-date" className={inputClass} type="date" {...register('preferredDate')} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="group-message">
          Message
        </label>
        <textarea
          id="group-message"
          className={`${inputClass} min-h-[160px] resize-y leading-6`}
          {...register('message', {
            required: 'Message is required',
            minLength: { value: 10, message: 'Please add a bit more detail' },
          })}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message?.message && (
          <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
        )}
      </div>

      {status.type === 'sent' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          Request sent — we’ll get back to you soon.
        </div>
      )}
      {status.type === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
          {status.message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          This sends an email to the team mailbox configured in `NEXT_PUBLIC_ADMIN_EMAIL`.
        </p>
        <button
          type="submit"
          disabled={status.type === 'sending'}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        >
          {status.type === 'sending' ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </form>
  );
}
