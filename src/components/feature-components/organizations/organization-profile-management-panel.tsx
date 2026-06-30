'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Pencil, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import DashboardProfileCard from '@/components/ui/dashboard-profile-card';
import { resizeImageToDataUrl } from '@/lib/image';

export type ManagedOrganizationProfile = {
  id: string;
  slug?: string | null;
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
const MAX_LOGO_LENGTH = 650_000;

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
  const [logoMessage, setLogoMessage] = useState('');
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProfileForm>({ defaultValues: organization });
  const logoUrl = watch('logo_url');
  useEffect(() => reset(organization), [organization, reset]);
  const mutation = useMutation({
    mutationFn: (values: ProfileForm) => updateProfile(organization.id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-organization-access'] });
      setOpen(false);
    },
  });
  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    setLogoMessage('Processing logo...');
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 800, quality: 0.86 });
      if (dataUrl.length > MAX_LOGO_LENGTH) {
        setLogoMessage('Logo is still too large after compression. Try a smaller image.');
        return;
      }
      setValue('logo_url', dataUrl, { shouldDirty: true, shouldValidate: true });
      setLogoMessage('Logo uploaded.');
    } catch (error) {
      setLogoMessage(error instanceof Error ? error.message : 'Unable to process logo image.');
    }
  };
  const infoItems = [
    {
      label: 'Location',
      value: [organization.city, organization.country].filter(Boolean).join(', ') || 'Not set',
    },
    {
      label: 'Contact',
      value: organization.contact_email || organization.contact_phone || 'Not set',
    },
    {
      label: 'Website',
      value: organization.website_url || 'Not set',
    },
    {
      label: 'Social',
      value: [organization.instagram_url && 'Instagram', organization.facebook_url && 'Facebook', organization.whatsapp_url && 'WhatsApp'].filter(Boolean).join(', ') || 'Not set',
    },
  ];

  return (
    <>
      <DashboardProfileCard
        eyebrow={<p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700 dark:text-emerald-300">Organization profile</p>}
        avatarUrl={organization.logo_url}
        avatarAlt={`${organization.name} logo`}
        avatarFallback={<span className="px-3 text-xs font-semibold text-gray-500 dark:text-slate-400">No logo</span>}
        avatarClassName="h-24 w-24 rounded-2xl"
        avatarImageClassName="object-contain"
        title={organization.name}
        subtitle={organization.tagline}
        description={organization.description}
        emptyDescription="Add a description so riders understand the organization, trail work, and how to contact the team."
        infoItems={infoItems}
        footerActions={
          <>
            {organization.slug && (
              <Link href={`/organizations/${organization.slug}`} className="inline-flex items-center rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950/40">
                View public profile
              </Link>
            )}
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" />Edit profile</button>
          </>
        }
      />
      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">Edit organization profile</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">Verification and visibility remain controlled by platform administration.</Dialog.Description></div><Dialog.Close className="rounded-full border border-gray-200 p-2 text-gray-600 dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /></Dialog.Close></div>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Name<input {...register('name', { required: 'Name is required.' })} className={inputClass} />{errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}</label>
          <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Tagline<input {...register('tagline')} className={inputClass} /></label>
          <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Description<textarea rows={4} {...register('description')} className={inputClass} /></label>
          <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Organization logo</label>
            <input type="hidden" {...register('logo_url')} />
            <div className="mt-3 flex flex-col gap-4 md:flex-row">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-950">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Organization logo preview" className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="px-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">No logo</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-xs font-normal leading-relaxed text-gray-500 dark:text-slate-400">
                  Upload a square logo or paste a hosted image URL. Uploaded images are compressed before saving.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleLogoUpload(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100 dark:text-slate-300 dark:file:bg-emerald-950 dark:file:text-emerald-200"
                />
                <input
                  type="url"
                  value={logoUrl || ''}
                  onChange={(event) => setValue('logo_url', event.target.value, { shouldDirty: true, shouldValidate: true })}
                  className={inputClass}
                  placeholder="Or paste logo image URL"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('logo_url', '', { shouldDirty: true, shouldValidate: true });
                        setLogoMessage('');
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Remove logo
                    </button>
                  )}
                  {logoMessage && <p className="text-xs font-normal text-gray-500 dark:text-slate-400">{logoMessage}</p>}
                </div>
              </div>
            </div>
          </div>
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
    </>
  );
}
