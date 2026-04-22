'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

export type SponsorTier = 'bronze' | 'silver' | 'gold' | 'custom';

type CollaborateFormValues = {
  name: string;
  email: string;
  company: string;
  sponsorTier: SponsorTier;
  subject: string;
  message: string;
  acceptTerms: boolean;
};

const defaultTemplate =
  `Hi LocoXperts team,\n\n` +
  `We’d like to collaborate.\n\n` +
  `What we can offer:\n- \n\n` +
  `What we’re looking for:\n- \n\n` +
  `Timeline / urgency:\n- \n\n` +
  `Budget range (optional):\n- \n`;

const tierTemplate: Record<SponsorTier, string> = {
  bronze:
    `Hi LocoXperts team,\n\n` +
    `We are interested in the Bronze sponsorship tier.\n\n` +
    `Brand / group:\n- \n\n` +
    `What we want to support (mapping / signage / events):\n- \n\n` +
    `Preferred start timeline:\n- \n\n` +
    `Budget range:\n- \n`,
  silver:
    `Hi LocoXperts team,\n\n` +
    `We are interested in the Silver sponsorship tier.\n\n` +
    `Brand / group:\n- \n\n` +
    `Expected collaboration scope:\n- \n\n` +
    `Preferred campaign duration:\n- \n\n` +
    `Budget range:\n- \n`,
  gold:
    `Hi LocoXperts team,\n\n` +
    `We are interested in the Gold sponsorship tier.\n\n` +
    `Brand / group:\n- \n\n` +
    `Strategic support area (trail workday / signage zone / platform campaign):\n- \n\n` +
    `Partnership timeline:\n- \n\n` +
    `Budget range:\n- \n`,
  custom: defaultTemplate,
};

const tierLabel: Record<SponsorTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  custom: 'Custom',
};

export default function CollaborateForm({
  compact = false,
  initialTier = 'custom',
}: {
  compact?: boolean;
  initialTier?: SponsorTier;
}) {
  const [status, setStatus] = useState<
    { type: 'idle' } |
    { type: 'sending' } |
    { type: 'sent'; channel?: 'email' | 'whatsapp'; whatsappLink?: string | null } |
    { type: 'error'; message: string }
  >({ type: 'idle' });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CollaborateFormValues>({
    defaultValues: {
      name: '',
      email: '',
      company: '',
      sponsorTier: initialTier,
      subject:
        initialTier === 'custom'
          ? 'Collaboration / sponsorship inquiry'
          : `Sponsorship inquiry (${tierLabel[initialTier]})`,
      message: tierTemplate[initialTier],
      acceptTerms: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus({ type: 'sending' });
    try {
      const response = await fetch('/api/contact/collaborate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'Failed to send message'
        );
      }
      setStatus({
        type: 'sent',
        channel: body?.notification_channel === 'whatsapp' ? 'whatsapp' : 'email',
        whatsappLink:
          typeof body?.whatsapp_link === 'string' ? body.whatsapp_link : null,
      });
      reset({
        name: '',
        email: '',
        company: '',
        sponsorTier: initialTier,
        subject:
          initialTier === 'custom'
            ? 'Collaboration / sponsorship inquiry'
            : `Sponsorship inquiry (${tierLabel[initialTier]})`,
        message: tierTemplate[initialTier],
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  });

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-emerald-400';
  const labelClass = 'mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200';

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className={compact ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-2'}>
        <div>
          <label className={labelClass} htmlFor="collab-name">
            Name
          </label>
          <input
            id="collab-name"
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
          <label className={labelClass} htmlFor="collab-email">
            Email
          </label>
          <input
            id="collab-email"
            className={inputClass}
            placeholder="you@company.com"
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

      <div className={compact ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-2'}>
        <div>
          <label className={labelClass} htmlFor="collab-company">
            Company / group (optional)
          </label>
          <input
            id="collab-company"
            className={inputClass}
            placeholder="Your company / riding group"
            {...register('company')}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="collab-tier">
            Sponsorship tier
          </label>
          <select
            id="collab-tier"
            className={inputClass}
            {...register('sponsorTier', { required: 'Select a sponsorship tier' })}
            onChange={(event) => {
              const nextTier = event.target.value as SponsorTier;
              // keep subject/message aligned with selected tier template
              setValue('sponsorTier', nextTier, { shouldDirty: true });
              setValue(
                'subject',
                nextTier === 'custom'
                  ? 'Collaboration / sponsorship inquiry'
                  : `Sponsorship inquiry (${tierLabel[nextTier]})`,
                { shouldDirty: true }
              );
              setValue('message', tierTemplate[nextTier], { shouldDirty: true });
            }}
            aria-invalid={Boolean(errors.sponsorTier)}
          >
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="custom">Custom</option>
          </select>
          {errors.sponsorTier?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.sponsorTier.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="collab-subject">
            Subject
          </label>
          <input
            id="collab-subject"
            className={inputClass}
            {...register('subject', { required: 'Subject is required' })}
            aria-invalid={Boolean(errors.subject)}
          />
          {errors.subject?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="collab-message">
          Message
        </label>
        <textarea
          id="collab-message"
          className={`${inputClass} min-h-[160px] resize-y leading-6`}
          {...register('message', {
            required: 'Message is required',
            minLength: { value: 20, message: 'Please add a bit more detail' },
          })}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message?.message && (
          <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
        )}
      </div>

      {status.type === 'sent' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p>Message sent — we&apos;ll get back to you soon.</p>
          {status.channel === 'whatsapp' && status.whatsappLink && (
            <a
              href={status.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              Continue on WhatsApp
            </a>
          )}
        </div>
      )}
      {status.type === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
          {status.message}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
          <input
            id="collab-terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            {...register('acceptTerms', {
              required: 'Please accept the terms and privacy policy.',
            })}
          />
          <label htmlFor="collab-terms" className="text-xs leading-5">
            I agree to the{' '}
            <a href="/terms" className="font-semibold text-green-700 hover:underline">
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" className="font-semibold text-green-700 hover:underline">
              Privacy Policy
            </a>
            .
          </label>
        </div>
        {errors.acceptTerms?.message && (
          <p className="text-xs text-red-600">{errors.acceptTerms.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          This notifies the team via email or WhatsApp based on availability.
        </p>
        <button
          type="submit"
          disabled={status.type === 'sending'}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        >
          {status.type === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
