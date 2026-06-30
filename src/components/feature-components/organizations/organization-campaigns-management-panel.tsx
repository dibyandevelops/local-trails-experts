'use client';

import { useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HandHeart, ImagePlus, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { resizeImageToDataUrl } from '@/lib/image';
import TrailAutocomplete from '@/components/ui/trail-autocomplete';
import type { TrailAutocompleteOption } from '@/components/ui/trail-autocomplete';

type TrailOption = TrailAutocompleteOption;
type CampaignStatus = 'draft' | 'active' | 'looking_for_funds' | 'completed' | 'paused' | 'archived';
type Campaign = {
  id: string;
  title: string;
  trail_name: string | null;
  target_amount_npr: string;
  raised_amount_npr: string;
  status: CampaignStatus;
};
type CampaignForm = {
  title: string;
  trail_id: string;
  description: string;
  target_amount_npr: string;
  qr_image_url: string;
  payment_note: string;
  status: CampaignStatus;
  starts_at: string;
  ends_at: string;
};

const defaultValues: CampaignForm = {
  title: '',
  trail_id: '',
  description: '',
  target_amount_npr: '',
  qr_image_url: '',
  payment_note: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
};
const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';
const helperClass = 'mt-1 text-xs font-normal leading-relaxed text-gray-500 dark:text-slate-400';
const MAX_QR_IMAGE_LENGTH = 650_000;

async function campaignRequest(organizationId: string, init?: RequestInit): Promise<{ campaigns: Campaign[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/campaigns`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Campaign request failed.');
  return data;
}

export default function OrganizationCampaignsManagementPanel({
  organizationId,
  trails,
}: {
  organizationId: string;
  trails: TrailOption[];
}) {
  const [open, setOpen] = useState(false);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [trailQuery, setTrailQuery] = useState('');
  const [selectedTrail, setSelectedTrail] = useState<TrailAutocompleteOption | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ['organization-campaigns-management', organizationId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => campaignRequest(organizationId),
    enabled: Boolean(organizationId),
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignForm>({ defaultValues });
  const qrImageUrl = watch('qr_image_url');
  const trailOptions = useMemo(() => {
    const normalizedQuery = trailQuery.trim().toLowerCase();
    if (!normalizedQuery) return trails.slice(0, 30);
    return trails
      .filter((trail) => {
        const haystack = [trail.name, trail.location, trail.difficulty, trail.sport_type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 30);
  }, [trailQuery, trails]);

  const create = useMutation({
    mutationFn: (values: CampaignForm) =>
      campaignRequest(organizationId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          target_amount_npr: Number(values.target_amount_npr),
        }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      reset(defaultValues);
      setQrMessage(null);
      setTrailQuery('');
      setSelectedTrail(null);
      setOpen(false);
    },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      campaignRequest(organizationId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  const handleQrUpload = async (file: File | null) => {
    if (!file) return;
    setQrMessage('Processing QR image...');
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 1200, quality: 0.86 });
      if (dataUrl.length > MAX_QR_IMAGE_LENGTH) {
        setQrMessage('QR image is still too large after compression. Try a smaller image.');
        return;
      }
      setValue('qr_image_url', dataUrl, { shouldDirty: true, shouldValidate: true });
      setQrMessage('QR image attached.');
    } catch (error) {
      setQrMessage(error instanceof Error ? error.message : 'Failed to process QR image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const campaigns = query.data?.campaigns || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Create trail-support campaigns, attach payment details, and control their public status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950"
        >
          <HandHeart className="h-4 w-4" />
          Create campaign
        </button>
      </div>

      {query.isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-slate-400">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
          No campaigns created yet.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Trail</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{campaign.title}</td>
                  <td className="px-3 py-3 text-gray-600 dark:text-slate-300">{campaign.trail_name || 'Organization-wide'}</td>
                  <td className="px-3 py-3 text-gray-600 dark:text-slate-300">
                    NPR {Number(campaign.raised_amount_npr || 0).toLocaleString()} / {Number(campaign.target_amount_npr).toLocaleString()}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={campaign.status}
                      onChange={(event) => updateStatus.mutate({ id: campaign.id, status: event.target.value as CampaignStatus })}
                      disabled={updateStatus.isPending}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {(['draft', 'active', 'looking_for_funds', 'completed', 'paused', 'archived'] as CampaignStatus[]).map((status) => (
                        <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
            <div className="flex justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Create campaign</Dialog.Title>
                <Dialog.Description className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-slate-300">
                  Campaigns can stay in draft while you prepare the public copy, target amount, payment QR, and dates. Use active or looking for funds only when the campaign is ready to publish.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit((values) => create.mutate(values))} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Campaign title
                <input
                  {...register('title', { required: 'Title is required.' })}
                  className={inputClass}
                  placeholder="Example: Rebuild the north ridge drainage"
                />
                <p className={helperClass}>Use a concrete title donors can understand quickly.</p>
                {errors.title && <span className="text-xs text-red-600 dark:text-red-300">{errors.title.message}</span>}
              </label>

              <div>
                <input type="hidden" {...register('trail_id')} />
                <TrailAutocomplete
                  label="Trail"
                  query={trailQuery}
                  value={selectedTrail}
                  options={trailOptions}
                  placeholder="Search linked trails"
                  emptyMessage="No linked trails match that search."
                  helperText="Pick a linked trail when the campaign funds work on a specific route. Leave empty for organization-wide campaigns."
                  onQueryChange={setTrailQuery}
                  onChange={(trail) => {
                    setSelectedTrail(trail);
                    setValue('trail_id', trail?.id || '', { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </div>

              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Target NPR
                <input
                  type="number"
                  min={1}
                  {...register('target_amount_npr', { required: 'Target is required.' })}
                  className={inputClass}
                  placeholder="50000"
                />
                <p className={helperClass}>Set the amount needed for the planned work.</p>
                {errors.target_amount_npr && <span className="text-xs text-red-600 dark:text-red-300">{errors.target_amount_npr.message}</span>}
              </label>

              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Description
                <textarea
                  rows={4}
                  {...register('description')}
                  className={inputClass}
                  placeholder="Explain the issue, the planned work, who will do it, and how supporters will see progress."
                />
                <p className={helperClass}>Include the reason for the campaign, expected outcome, and how updates will be shared.</p>
              </label>

              <div className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Payment QR
                <input type="hidden" {...register('qr_image_url')} />
                <div className="mt-1 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-[180px_1fr]">
                  <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950">
                    {qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrImageUrl} alt="Payment QR preview" className="h-full max-h-44 w-full object-contain p-3" />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-normal text-gray-600 dark:text-slate-300">
                      Upload the QR code supporters should scan for payment. A pasted image URL can also be used if you host the QR elsewhere.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleQrUpload(event.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100 dark:text-slate-300 dark:file:bg-emerald-950 dark:file:text-emerald-200"
                    />
                    <input
                      type="url"
                      value={qrImageUrl}
                      onChange={(event) => setValue('qr_image_url', event.target.value, { shouldDirty: true, shouldValidate: true })}
                      className={inputClass}
                      placeholder="Or paste QR image URL"
                    />
                    {qrImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('qr_image_url', '', { shouldDirty: true, shouldValidate: true });
                          setQrMessage(null);
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Remove QR
                      </button>
                    )}
                    {qrMessage && <p className="text-xs font-normal text-gray-500 dark:text-slate-400">{qrMessage}</p>}
                  </div>
                </div>
              </div>

              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Payment note
                <input
                  {...register('payment_note')}
                  className={inputClass}
                  placeholder="Example: Add campaign title in the payment remarks."
                />
                <p className={helperClass}>Tell supporters which payment reference or remarks your team needs to reconcile donations.</p>
              </label>

              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Starts
                <input type="date" {...register('starts_at')} className={inputClass} />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Ends
                <input type="date" {...register('ends_at')} className={inputClass} />
              </label>

              {create.error && <p className="text-sm text-red-600 dark:text-red-300 md:col-span-2">{create.error.message}</p>}

              <div className="flex justify-end gap-2 md:col-span-2">
                <Dialog.Close
                  type="button"
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950"
                >
                  {create.isPending ? 'Creating...' : 'Create draft'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
