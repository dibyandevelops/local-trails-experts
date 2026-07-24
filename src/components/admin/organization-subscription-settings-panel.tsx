'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resizeImageToDataUrl } from '@/lib/image';

type SubscriptionSettings = {
  payment_qr_image_url: string | null;
  payment_note: string;
  is_payment_enabled: boolean;
  updated_at: string | null;
};

const defaultPaymentNote =
  'Scan the QR, pay from your wallet or bank app, then upload the payment screenshot for admin review.';

async function settingsRequest(init?: RequestInit) {
  const response = await fetch('/api/organization-subscription-settings', { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Subscription settings request failed.');
  return data as { settings: SubscriptionSettings };
}

function formatDate(value: string | null) {
  if (!value) return 'Not updated yet';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function OrganizationSubscriptionSettingsPanel() {
  const queryClient = useQueryClient();
  const [paymentQrImageUrl, setPaymentQrImageUrl] = useState('');
  const [paymentNote, setPaymentNote] = useState(defaultPaymentNote);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(false);
  const [imageMessage, setImageMessage] = useState('');

  const query = useQuery({
    queryKey: ['organization-subscription-settings'],
    queryFn: () => settingsRequest(),
  });
  const save = useMutation({
    mutationFn: () =>
      settingsRequest({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_qr_image_url: paymentQrImageUrl || null,
          payment_note: paymentNote,
          is_payment_enabled: isPaymentEnabled,
        }),
      }),
    onSuccess: async (data) => {
      queryClient.setQueryData(['organization-subscription-settings'], data);
      await queryClient.invalidateQueries({ queryKey: ['my-organization-subscription'] });
    },
  });

  useEffect(() => {
    if (!query.data?.settings) return;
    setPaymentQrImageUrl(query.data.settings.payment_qr_image_url || '');
    setPaymentNote(query.data.settings.payment_note || defaultPaymentNote);
    setIsPaymentEnabled(query.data.settings.is_payment_enabled);
  }, [query.data?.settings]);

  const handleQrUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageMessage('Upload a valid QR image.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, {
        maxDimension: 900,
        quality: 0.88,
      });
      setPaymentQrImageUrl(dataUrl);
      setImageMessage('QR image ready. Save settings to publish it.');
    } catch {
      setImageMessage('Could not process that image.');
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Subscription payment settings</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Upload the payment QR, set the rider-facing payment note, and control whether organization payments are open.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isPaymentEnabled
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
          }`}
        >
          {isPaymentEnabled ? 'Payments enabled' : 'Payments paused'}
        </span>
      </div>

      {query.isLoading ? <p className="text-sm text-gray-600 dark:text-slate-300">Loading payment settings...</p> : null}
      {query.error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {query.error instanceof Error ? query.error.message : 'Failed to load subscription settings.'}
        </p>
      ) : null}
      {save.error ? (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {save.error instanceof Error ? save.error.message : 'Failed to save subscription settings.'}
        </p>
      ) : null}
      {save.isSuccess ? (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          Subscription payment settings saved.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          {paymentQrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={paymentQrImageUrl} alt="Subscription payment QR preview" className="aspect-square w-full rounded-xl bg-white object-contain p-2" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              No QR uploaded
            </div>
          )}
          <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <ImagePlus className="h-4 w-4" />
            Upload QR image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleQrUpload(event.target.files?.[0] || null);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {imageMessage ? <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">{imageMessage}</p> : null}
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
            QR image URL or uploaded image data
            <input
              value={paymentQrImageUrl}
              onChange={(event) => setPaymentQrImageUrl(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="https://..."
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
            Payment note
            <textarea
              rows={4}
              value={paymentNote}
              onChange={(event) => setPaymentNote(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
            <input
              type="checkbox"
              checked={isPaymentEnabled}
              onChange={(event) => setIsPaymentEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-700"
            />
            <span>
              <span className="block font-semibold text-gray-900 dark:text-slate-100">Allow organizations to submit subscription payments</span>
              <span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-slate-300">
                Keep this paused while the QR is missing or payment details are not ready.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Last updated: {formatDate(query.data?.settings.updated_at || null)}
            </p>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {save.isPending ? 'Saving...' : 'Save payment settings'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
