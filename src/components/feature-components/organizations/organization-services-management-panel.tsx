'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { BriefcaseBusiness, Sparkles, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { OrganizationService } from '@/components/services/services-directory';
import { resizeImageToDataUrl } from '@/lib/image';
import { inferOrganizationServiceCategory } from '@/lib/organization-service-category';
import { getServiceCategoryLabel } from '@/services/constants/organization-services';

type OrganizationServiceDefaults = {
  name?: string | null;
  city?: string | null;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
};

type ServiceForm = {
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

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

function buildDefaultValues(organization?: OrganizationServiceDefaults): ServiceForm {
  const location = [organization?.city, organization?.country].filter(Boolean).join(', ');
  return {
    title: '',
    description: '',
    price_npr: '',
    price_note: '',
    location: location || 'Kathmandu, Nepal',
    contact_email: organization?.contact_email || '',
    contact_phone: organization?.contact_phone || '',
    website_url: organization?.website_url || '',
    image_url: '',
  };
}

function inferServiceTitle(text: string) {
  const value = text.toLowerCase();
  if (value.includes('photo') || value.includes('camera') || value.includes('video')) return 'Trail ride photography';
  if (value.includes('shuttle') || value.includes('transport') || value.includes('pickup')) return 'Trail shuttle transport';
  if (value.includes('coach') || value.includes('training') || value.includes('skills')) return 'MTB skills coaching';
  if (value.includes('guide') || value.includes('tour') || value.includes('route')) return 'Guided trail ride';
  if (value.includes('rent') || value.includes('bike hire')) return 'Bike rental support';
  if (value.includes('repair') || value.includes('mechanic') || value.includes('maintenance')) return 'Trail-side bike repair';
  if (value.includes('event') || value.includes('race')) return 'Event support service';
  if (value.includes('design') || value.includes('poster') || value.includes('graphic')) return 'Creative design support';
  return 'Custom ride support service';
}

async function serviceRequest(organizationId: string, init?: RequestInit): Promise<{ services: OrganizationService[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/services`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Service request failed.');
  return data;
}

export default function OrganizationServicesManagementPanel({
  organizationId,
  organization,
  canCreateRevenueFeatures = false,
}: {
  organizationId: string;
  organization?: OrganizationServiceDefaults;
  canCreateRevenueFeatures?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [imageMessage, setImageMessage] = useState('');
  const queryClient = useQueryClient();
  const queryKey = ['organization-services-management', organizationId] as const;
  const defaultValues = useMemo(() => buildDefaultValues(organization), [organization]);
  const query = useQuery({ queryKey, queryFn: () => serviceRequest(organizationId), enabled: Boolean(organizationId) });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceForm>({ defaultValues });
  const description = watch('description') || '';
  const title = watch('title') || '';
  const imageUrl = watch('image_url') || '';
  const suggestedTitle = description.trim().length >= 12 ? inferServiceTitle(description) : '';
  const inferredCategory = inferOrganizationServiceCategory(`${title}\n${description}`);

  const create = useMutation({
    mutationFn: (values: ServiceForm) =>
      serviceRequest(organizationId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          price_npr: values.price_npr === '' ? null : Number(values.price_npr),
        }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      reset(defaultValues);
      setImageMessage('');
      setOpen(false);
    },
  });
  const toggle = useMutation({
    mutationFn: (service: OrganizationService) =>
      serviceRequest(organizationId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: service.id, is_active: !service.is_active }),
      }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageMessage('Select a valid image file.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 1200, quality: 0.86 });
      if (dataUrl.length > 650_000) {
        setImageMessage('The resized cover image is still too large. Choose a smaller image.');
        return;
      }
      setValue('image_url', dataUrl, { shouldDirty: true, shouldValidate: true });
      setImageMessage('Cover image ready.');
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : 'Unable to process image.');
    }
  };

  const services = query.data?.services || [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization services</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Publish services your organization offers. These appear in the public services directory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!canCreateRevenueFeatures) return;
            reset(defaultValues);
            setImageMessage('');
            setOpen(true);
          }}
          disabled={!canCreateRevenueFeatures}
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-950"
        >
          <BriefcaseBusiness className="h-4 w-4" />
          Add service
        </button>
      </div>
      {!canCreateRevenueFeatures && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
          Service publishing is available after the organization is verified and subscribed.{' '}
          <Link href="/organizations/subscription" className="font-bold underline underline-offset-2">
            View the Partner Plan
          </Link>
        </p>
      )}

      {query.isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-slate-400">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
          No organization services yet.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{service.title}</p>
                    {service.description && <p className="line-clamp-1 text-xs text-gray-500 dark:text-slate-400">{service.description}</p>}
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-slate-200">
                    {service.price_npr !== null ? `NPR ${Number(service.price_npr).toLocaleString()}` : service.price_note || 'Contact'}
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-slate-300">{service.location || 'Not specified'}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">{service.is_active ? 'Active' : 'Paused'}</span></td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(service)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">
                      {service.is_active ? 'Pause' : 'Activate'}
                    </button>
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
            <div className="flex justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Add organization service</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Describe the service, use a suggested title if helpful, and add a cover image.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <form onSubmit={handleSubmit((values) => create.mutate(values))} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">
                Description
                <textarea rows={4} {...register('description')} className={inputClass} placeholder="Example: Half-day photo coverage for MTB rides around Kathmandu..." />
              </label>
              <label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">
                Service title
                <input {...register('title', { required: 'Title is required.' })} className={inputClass} placeholder="MTB ride photography" />
                {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
              </label>
              {suggestedTitle && (
                <button
                  type="button"
                  onClick={() => setValue('title', suggestedTitle, { shouldDirty: true, shouldValidate: true })}
                  className="md:col-span-2 inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                >
                  <Sparkles className="h-4 w-4" />
                  Use suggested title: {suggestedTitle}
                </button>
              )}
              {(title.trim() || description.trim()) && (
                <p className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-200">
                  Automatic category: {getServiceCategoryLabel(inferredCategory)}
                </p>
              )}
              <label className="text-sm font-semibold dark:text-slate-200">Starting price NPR<input type="number" min={0} {...register('price_npr')} className={inputClass} /></label>
              <label className="text-sm font-semibold dark:text-slate-200">Pricing note<input {...register('price_note')} className={inputClass} placeholder="Per rider, half-day" /></label>
              <label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">Service location<input {...register('location')} className={inputClass} /></label>
              <label className="text-sm font-semibold dark:text-slate-200">Contact email<input type="email" {...register('contact_email')} className={inputClass} /></label>
              <label className="text-sm font-semibold dark:text-slate-200">Contact phone<input {...register('contact_phone')} className={inputClass} /></label>
              <label className="md:col-span-2 text-sm font-semibold dark:text-slate-200">Service website<input type="url" {...register('website_url')} className={inputClass} /></label>
              <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="text-sm font-semibold dark:text-slate-200">Cover image</label>
                  <label className="inline-flex cursor-pointer rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Upload cover
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { void handleCoverUpload(event.target.files?.[0] || null); event.currentTarget.value = ''; }} />
                  </label>
                </div>
                <input {...register('image_url')} className={inputClass} placeholder="Optional: https://example.com/service-cover.jpg" />
                {imageMessage && <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">{imageMessage}</p>}
                {imageUrl && <img src={imageUrl} alt="Service cover preview" className="mt-3 h-36 w-full rounded-2xl object-cover" />}
              </div>
              {create.error && <p className="md:col-span-2 text-sm text-red-600 dark:text-red-300">{create.error.message}</p>}
              <div className="md:col-span-2 flex justify-end gap-2">
                <Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</Dialog.Close>
                <button type="submit" disabled={create.isPending} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">
                  {create.isPending ? 'Creating...' : 'Publish service'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
