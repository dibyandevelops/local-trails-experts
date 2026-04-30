'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { resizeImageToDataUrl } from '@/lib/image';

type FormValues = {
  name: string;
  email: string;
  company_name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'custom';
  agenda: string;
  note: string;
};

export default function SponsorRequestModal({
  triggerLabel = 'Submit sponsor request',
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      email: '',
      company_name: '',
      tier: 'custom',
      agenda: '',
      note: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    try {
      const response = await fetch('/api/sponsor-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...values,
          company_logo_url: logoDataUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit request.');
      }
      setStatus('Sponsor request submitted successfully.');
      reset();
      setLogoDataUrl(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to submit request.');
    }
  });

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-emerald-400';

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
        >
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Sponsor request
            </Dialog.Title>
            <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Close
            </Dialog.Close>
          </div>

          {status && (
            <p className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {status}
            </p>
          )}

          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Name
              </label>
              <input className={inputClass} {...register('name', { required: true })} />
              {errors.name && <p className="mt-1 text-xs text-red-600">Name is required.</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Email
              </label>
              <input className={inputClass} {...register('email', { required: true })} />
              {errors.email && <p className="mt-1 text-xs text-red-600">Valid email is required.</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Company
              </label>
              <input className={inputClass} {...register('company_name', { required: true })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Tier
              </label>
              <select className={inputClass} {...register('tier', { required: true })}>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Company logo (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                className={inputClass}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setLogoDataUrl(null);
                    return;
                  }
                  const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 512, quality: 0.8 });
                  setLogoDataUrl(dataUrl);
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Agenda
              </label>
              <textarea
                className={`${inputClass} min-h-[120px]`}
                placeholder="What is your agenda and expected collaboration outcome?"
                {...register('agenda', { required: true, minLength: 10 })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-slate-200">
                Notes (optional)
              </label>
              <textarea className={`${inputClass} min-h-[80px]`} {...register('note')} />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

