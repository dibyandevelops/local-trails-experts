'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BriefcaseBusiness, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { OrganizationService } from '@/components/services/services-directory';
import { SERVICE_CATEGORIES, getServiceCategoryLabel } from '@/services/constants/organization-services';

type ServiceForm = {
  category: string;
  title: string;
  description: string;
  price_npr: string;
  price_note: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  image_url: string;
};

const defaultValues: ServiceForm = { category: 'ride_photography', title: '', description: '', price_npr: '', price_note: '', location: 'Kathmandu, Nepal', contact_email: '', contact_phone: '', website_url: '', image_url: '' };
const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

async function serviceRequest(organizationId: string, init?: RequestInit): Promise<{ services: OrganizationService[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/services`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Service request failed.');
  return data;
}

export default function OrganizationServicesManagementPanel({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['organization-services-management', organizationId] as const;
  const query = useQuery({ queryKey, queryFn: () => serviceRequest(organizationId), enabled: Boolean(organizationId) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceForm>({ defaultValues });
  const create = useMutation({ mutationFn: (values: ServiceForm) => serviceRequest(organizationId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, price_npr: values.price_npr === '' ? null : Number(values.price_npr) }) }), onSuccess: (data) => { queryClient.setQueryData(queryKey, data); reset(defaultValues); setOpen(false); } });
  const toggle = useMutation({ mutationFn: (service: OrganizationService) => serviceRequest(organizationId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: service.id, is_active: !service.is_active }) }), onSuccess: (data) => queryClient.setQueryData(queryKey, data) });
  const services = query.data?.services || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization services</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Offer photography, transport, graphics, coaching, rentals, repairs, or other paid support.</p></div><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950"><BriefcaseBusiness className="h-4 w-4" />Add service</button></div>
      {query.isLoading ? <p className="mt-5 text-sm text-gray-500">Loading services...</p> : services.length === 0 ? <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">No organization services yet. Trail-specific operational services remain managed separately below.</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400"><tr><th className="px-3 py-2">Service</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-800">{services.map((service) => <tr key={service.id}><td className="px-3 py-3"><p className="font-semibold text-gray-900 dark:text-white">{service.title}</p><p className="text-xs text-gray-500 dark:text-slate-400">{getServiceCategoryLabel(service.category)}</p></td><td className="px-3 py-3 text-gray-700 dark:text-slate-200">{service.price_npr !== null ? `NPR ${Number(service.price_npr).toLocaleString()}` : service.price_note || 'Contact'}</td><td className="px-3 py-3 text-gray-600 dark:text-slate-300">{service.location || 'Not specified'}</td><td className="px-3 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">{service.is_active ? 'Active' : 'Paused'}</span></td><td className="px-3 py-3 text-right"><button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(service)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">{service.is_active ? 'Pause' : 'Activate'}</button></td></tr>)}</tbody></table></div>}
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950"><div className="flex justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Add organization service</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">This appears in the public services directory, not as a trail operation.</Dialog.Description></div><Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close></div><form onSubmit={handleSubmit((values) => create.mutate(values))} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold dark:text-slate-200">Category<select {...register('category')} className={inputClass}>{SERVICE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold dark:text-slate-200">Service title<input {...register('title', { required: 'Title is required.' })} className={inputClass} placeholder="MTB ride photography" />{errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}</label><label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">Description<textarea rows={4} {...register('description')} className={inputClass} /></label><label className="text-sm font-semibold dark:text-slate-200">Starting price NPR<input type="number" min={0} {...register('price_npr')} className={inputClass} /></label><label className="text-sm font-semibold dark:text-slate-200">Pricing note<input {...register('price_note')} className={inputClass} placeholder="Per rider, half-day" /></label><label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">Service location<input {...register('location')} className={inputClass} /></label><label className="text-sm font-semibold dark:text-slate-200">Contact email<input type="email" {...register('contact_email')} className={inputClass} /></label><label className="text-sm font-semibold dark:text-slate-200">Contact phone<input {...register('contact_phone')} className={inputClass} /></label><label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">Service website<input type="url" {...register('website_url')} className={inputClass} /></label><label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">Cover image URL<input {...register('image_url')} className={inputClass} /></label>{create.error && <p className="md:col-span-2 text-sm text-red-600">{create.error.message}</p>}<div className="md:col-span-2 flex justify-end gap-2"><Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</Dialog.Close><button type="submit" disabled={create.isPending} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">{create.isPending ? 'Creating...' : 'Publish service'}</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    </section>
  );
}
