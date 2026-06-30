'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { HandHeart, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

type TrailOption = { id: string; name: string };
type CampaignStatus = 'draft' | 'active' | 'looking_for_funds' | 'completed' | 'paused' | 'archived';
type Campaign = { id: string; title: string; trail_name: string | null; target_amount_npr: string; raised_amount_npr: string; status: CampaignStatus };
type CampaignForm = { title: string; trail_id: string; description: string; target_amount_npr: string; qr_image_url: string; payment_note: string; status: CampaignStatus; starts_at: string; ends_at: string };
const defaultValues: CampaignForm = { title: '', trail_id: '', description: '', target_amount_npr: '', qr_image_url: '', payment_note: '', status: 'draft', starts_at: '', ends_at: '' };
const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

async function campaignRequest(organizationId: string, init?: RequestInit): Promise<{ campaigns: Campaign[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/campaigns`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Campaign request failed.');
  return data;
}

export default function OrganizationCampaignsManagementPanel({ organizationId, trails }: { organizationId: string; trails: TrailOption[] }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['organization-campaigns-management', organizationId] as const;
  const query = useQuery({ queryKey, queryFn: () => campaignRequest(organizationId), enabled: Boolean(organizationId) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignForm>({ defaultValues });
  const create = useMutation({
    mutationFn: (values: CampaignForm) => campaignRequest(organizationId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, target_amount_npr: Number(values.target_amount_npr) }) }),
    onSuccess: (data) => { queryClient.setQueryData(queryKey, data); reset(defaultValues); setOpen(false); },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) => campaignRequest(organizationId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const campaigns = query.data?.campaigns || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Campaigns</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Create trail-support campaigns and control their public status.</p></div><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950"><HandHeart className="h-4 w-4" />Create campaign</button></div>
      {query.isLoading ? <p className="mt-5 text-sm text-gray-500">Loading campaigns...</p> : campaigns.length === 0 ? <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">No campaigns created yet.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400"><tr><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">Trail</th><th className="px-3 py-2">Progress</th><th className="px-3 py-2">Status</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-800">{campaigns.map((campaign) => <tr key={campaign.id}><td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">{campaign.title}</td><td className="px-3 py-3 text-gray-600 dark:text-slate-300">{campaign.trail_name || 'Organization-wide'}</td><td className="px-3 py-3 text-gray-600 dark:text-slate-300">NPR {Number(campaign.raised_amount_npr || 0).toLocaleString()} / {Number(campaign.target_amount_npr).toLocaleString()}</td><td className="px-3 py-3"><select value={campaign.status} onChange={(event) => updateStatus.mutate({ id: campaign.id, status: event.target.value as CampaignStatus })} disabled={updateStatus.isPending} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{(['draft', 'active', 'looking_for_funds', 'completed', 'paused', 'archived'] as CampaignStatus[]).map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></td></tr>)}</tbody></table></div>}
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950"><div className="flex justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Create campaign</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">Start as draft until payment and campaign details are ready.</Dialog.Description></div><Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close></div>
        <form onSubmit={handleSubmit((values) => create.mutate(values))} className="mt-5 grid gap-4 md:grid-cols-2"><label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Title<input {...register('title', { required: 'Title is required.' })} className={inputClass} />{errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}</label><label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Trail<select {...register('trail_id')} className={inputClass}><option value="">Organization-wide</option>{trails.map((trail) => <option key={trail.id} value={trail.id}>{trail.name}</option>)}</select></label><label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Target NPR<input type="number" min={1} {...register('target_amount_npr', { required: 'Target is required.' })} className={inputClass} /></label><label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Description<textarea rows={4} {...register('description')} className={inputClass} /></label><label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Payment QR URL<input type="url" {...register('qr_image_url')} className={inputClass} /></label><label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Payment note<input {...register('payment_note')} className={inputClass} /></label><label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Starts<input type="date" {...register('starts_at')} className={inputClass} /></label><label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Ends<input type="date" {...register('ends_at')} className={inputClass} /></label>{create.error && <p className="md:col-span-2 text-sm text-red-600">{create.error.message}</p>}<div className="md:col-span-2 flex justify-end gap-2"><Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700 dark:text-slate-200">Cancel</Dialog.Close><button type="submit" disabled={create.isPending} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">{create.isPending ? 'Creating...' : 'Create draft'}</button></div></form>
      </Dialog.Content></Dialog.Portal></Dialog.Root>
    </section>
  );
}
