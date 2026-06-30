'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Pencil, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

export type ManagedOrganizationProfile = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  country: string | null;
};

type ProfileForm = Omit<ManagedOrganizationProfile, 'id'>;
const inputClass = 'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

async function updateProfile(id: string, values: ProfileForm) {
  const response = await fetch(`/api/organizations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to update organization profile.');
  return data.organization as ManagedOrganizationProfile;
}

export default function OrganizationProfileManagementPanel({ organization }: { organization: ManagedOrganizationProfile }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({ defaultValues: organization });
  useEffect(() => reset(organization), [organization, reset]);
  const mutation = useMutation({
    mutationFn: (values: ProfileForm) => updateProfile(organization.id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-trail-builder-access'] });
      setOpen(false);
    },
  });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization profile</h2><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Maintain public identity, contact details, logo, and social links.</p></div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" />Edit profile</button>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Edit organization profile</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">Verification and visibility remain controlled by platform administration.</Dialog.Description></div><Dialog.Close className="rounded-full border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close></div>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Name<input {...register('name', { required: 'Name is required.' })} className={inputClass} />{errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}</label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Tagline<input {...register('tagline')} className={inputClass} /></label>
          <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Description<textarea rows={4} {...register('description')} className={inputClass} /></label>
          <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Logo URL<input type="url" {...register('logo_url')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Contact email<input type="email" {...register('contact_email')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Contact phone<input {...register('contact_phone')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">City<input {...register('city')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Country<input {...register('country')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Website<input type="url" {...register('website_url')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Instagram URL<input type="url" {...register('instagram_url')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Facebook URL<input type="url" {...register('facebook_url')} className={inputClass} /></label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">WhatsApp URL<input type="url" {...register('whatsapp_url')} className={inputClass} /></label>
          {mutation.error && <p className="md:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{mutation.error.message}</p>}
          <div className="md:col-span-2 flex justify-end gap-2"><Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-slate-700 dark:text-slate-200">Cancel</Dialog.Close><button type="submit" disabled={mutation.isPending} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-slate-950">{mutation.isPending ? 'Saving...' : 'Save profile'}</button></div>
        </form>
      </Dialog.Content></Dialog.Portal></Dialog.Root>
    </section>
  );
}
