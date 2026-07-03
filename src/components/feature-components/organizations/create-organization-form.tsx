'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useCurrentUser } from '@/hooks/use-current-user';
import { resizeImageToDataUrl } from '@/lib/image';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import type { User } from '@/types';

type OrganizationForm = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo_url: string;
  website_url: string;
  contact_phone: string;
  city: string;
  country: string;
};

type CreatedOrganization = { id: string; slug: string; name: string };

type ExpertApplicationForm = {
  name: string;
  phone: string;
  city: string;
  credentials: string;
  sports: string[];
  acceptTerms: boolean;
};

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

const processSteps = [
  'Submit this account for expert verification.',
  'Admin reviews the expert application.',
  'Create and own an organization after approval.',
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function createOrganization(values: OrganizationForm) {
  const response = await fetch('/api/organizations/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to create organization.');
  return data as { success: true; organization: CreatedOrganization };
}

async function submitExpertApplication(values: ExpertApplicationForm) {
  const response = await fetch('/api/experts/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to submit expert application.');
  return data as { message: string };
}

export default function CreateOrganizationForm() {
  const { data: user = null, isLoading } = useCurrentUser();
  const [createdOrganization, setCreatedOrganization] = useState<CreatedOrganization | null>(null);
  const [logoMessage, setLogoMessage] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<OrganizationForm>({
    defaultValues: {
      name: '',
      slug: '',
      tagline: '',
      description: '',
      logo_url: '',
      website_url: '',
      contact_phone: '',
      city: 'Kathmandu',
      country: 'Nepal',
    },
  });
  const name = watch('name');
  const logoUrl = watch('logo_url');
  const mutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: (data) => setCreatedOrganization(data.organization),
  });

  useEffect(() => {
    if (!dirtyFields.slug) setValue('slug', toSlug(name));
  }, [dirtyFields.slug, name, setValue]);

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoMessage('Select a valid image file.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 800, quality: 0.86 });
      if (dataUrl.length > 650_000) {
        setLogoMessage('The resized logo is still too large. Choose a smaller image.');
        return;
      }
      setValue('logo_url', dataUrl, { shouldDirty: true, shouldValidate: true });
      setLogoMessage('Logo ready to upload.');
    } catch (error) {
      setLogoMessage(error instanceof Error ? error.message : 'Unable to process the logo.');
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-gray-600">Checking expert access...</div>;
  }

  if (!user) {
    return (
      <AccessMessage
        title="Sign in as a verified expert"
        body="Organization creation is available only to expert accounts approved by a platform admin."
        href="/?login=1&next=%2Forganizations%2Fcreate"
        action="Sign in"
      />
    );
  }

  if (user.role !== 'expert') {
    return <ExpertApplicationGate user={user} />;
  }

  if (!user.is_verified_expert) {
    return (
      <AccessMessage
        title="Expert verification is pending"
        body="Your expert account must be approved by an admin before you can create an organization. You can review or update your verification details from your expert dashboard."
        href="/experts/me"
        action="View expert dashboard"
      />
    );
  }

  if (createdOrganization) {
    return (
      <AccessMessage
        title={`${createdOrganization.name} is ready`}
        body="You are the organization owner. You can now manage its profile, team, services, programs, and trail work."
        href="/organizations/me"
        action="Open organization dashboard"
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-slate-950">
        <Building2 className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
        <h1 className="mt-4 text-3xl font-black text-gray-950 dark:text-white">Create an organization</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
          Your verified expert account will become the organization owner. Each expert may own one organization.
        </p>
      </header>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="mt-6 grid gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Organization name<input {...register('name', { required: 'Organization name is required.' })} className={inputClass} placeholder="Kathmandu Trail Collective" />{errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}</label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Public URL slug<input {...register('slug', { required: 'Slug is required.', pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Use lowercase letters, numbers, and hyphens.' } })} className={inputClass} />{errors.slug && <span className="mt-1 block text-xs text-red-600">{errors.slug.message}</span>}</label>
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Tagline<input {...register('tagline')} className={inputClass} placeholder="Local rides, trail care, and skills development" /></label>
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">What does your organization do?<textarea rows={5} {...register('description', { required: 'Describe your organization.' })} className={inputClass} />{errors.description && <span className="mt-1 block text-xs text-red-600">{errors.description.message}</span>}</label>
        <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Organization logo</label>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Upload a logo during registration, or paste a hosted image URL. Square PNG/JPG works best.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => { void handleLogoUpload(event.target.files?.[0] || null); event.currentTarget.value = ''; }} />
            </label>
          </div>
          <div className="mt-3">
            <input {...register('logo_url')} className={inputClass} placeholder="Optional: https://example.com/logo.png" />
          </div>
          {logoMessage && <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">{logoMessage}</p>}
          {logoUrl && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 p-3 dark:border-slate-700"><img src={logoUrl} alt="Organization logo preview" className="h-20 w-20 rounded-2xl bg-gray-100 object-contain dark:bg-slate-800" /><button type="button" onClick={() => { setValue('logo_url', '', { shouldDirty: true }); setLogoMessage(''); }} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-slate-700 dark:text-slate-200">Remove logo</button></div>}
        </div>
        <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Owner email
          <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {user.email}
          </div>
          <p className="mt-1 text-xs font-normal text-gray-500 dark:text-slate-400">
            This comes from your verified expert account and cannot be changed here.
          </p>
        </div>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Contact phone<input {...register('contact_phone')} className={inputClass} /></label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">City<input {...register('city')} className={inputClass} /></label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Country<input {...register('country')} className={inputClass} /></label>
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Website<input type="url" {...register('website_url')} className={inputClass} /></label>
        {mutation.error && <p className="md:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{mutation.error.message}</p>}
        <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={mutation.isPending} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">{mutation.isPending ? 'Creating...' : 'Create organization'}</button></div>
      </form>
    </div>
  );
}

function ExpertApplicationGate({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ExpertApplicationForm>({
    defaultValues: {
      name: user.name || '',
      phone: user.phone || '',
      city: user.city || 'Kathmandu',
      credentials: user.bio || '',
      sports: Array.isArray(user.sports) && user.sports.length > 0 ? user.sports : ['mtb'],
      acceptTerms: false,
    },
  });
  const selectedSports = watch('sports') || [];
  const mutation = useMutation({
    mutationFn: submitExpertApplication,
    onSuccess: async () => {
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.me });
      window.dispatchEvent(new Event('auth-changed'));
    },
  });

  const toggleSport = (sport: string) => {
    clearErrors('sports');
    setValue(
      'sports',
      selectedSports.includes(sport)
        ? selectedSports.filter((value) => value !== sport)
        : [...selectedSports, sport],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  if (submitted) {
    return (
      <AccessMessage
        title="Expert application submitted"
        body="This account is now pending admin verification. Once approved, return here to create and own your organization."
        href="/experts/me"
        action="View expert dashboard"
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
          Organization access
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">Verify this account as an expert first</h1>
        <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-slate-300">
          You are signed in as {user.email}. Use this account for expert verification now; after admin approval, the same account can create and own an organization.
        </p>
        <ProcessSteps />
      </section>

      <form
        onSubmit={handleSubmit((values) => {
          if (!values.sports.length) {
            setError('sports', { message: 'Select at least one sport.' });
            return;
          }
          mutation.mutate(values);
        })}
        className="mt-6 grid gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2"
      >
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Full name
          <input {...register('name', { required: 'Full name is required.' })} className={inputClass} />
          {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Phone
          <input {...register('phone', { required: 'Phone is required.' })} className={inputClass} placeholder="+9779812345678" />
          {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone.message}</span>}
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Home base city
          <input {...register('city')} className={inputClass} />
        </label>
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Sports</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRAIL_SPORTS.map((sport) => (
              <button
                key={sport.value}
                type="button"
                onClick={() => toggleSport(sport.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  selectedSports.includes(sport.value)
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>
          {errors.sports && <span className="mt-2 block text-xs text-red-600">{errors.sports.message}</span>}
        </div>
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Experience and credentials
          <textarea
            rows={5}
            {...register('credentials', { required: 'Describe your trail experience, guiding history, coaching, certifications, or community work.' })}
            className={inputClass}
            placeholder="Tell admins what qualifies you as a local trail expert."
          />
          {errors.credentials && <span className="mt-1 block text-xs text-red-600">{errors.credentials.message}</span>}
        </label>
        <label className="md:col-span-2 flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
          <input type="checkbox" {...register('acceptTerms', { required: 'Please accept the terms before submitting.' })} className="mt-0.5" />
          <span>I agree to the platform terms and understand organization creation is available only after admin verification.</span>
        </label>
        {errors.acceptTerms && <span className="md:col-span-2 text-xs text-red-600">{errors.acceptTerms.message}</span>}
        {mutation.error && <p className="md:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{mutation.error.message}</p>}
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs text-gray-500 dark:text-slate-400">
            No new login is created. This upgrades your current account into a pending expert account.
          </p>
          <button type="submit" disabled={mutation.isPending} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">
            {mutation.isPending ? 'Submitting...' : 'Submit for expert verification'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProcessSteps() {
  return (
    <ol className="mt-4 grid gap-2 text-sm text-gray-700 dark:text-slate-300 sm:grid-cols-3">
      {processSteps.map((step, index) => (
        <li key={step} className="rounded-2xl border border-amber-200 bg-white/70 p-3 dark:border-amber-900/70 dark:bg-slate-950/40">
          <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
            {index + 1}
          </span>
          <p>{step}</p>
        </li>
      ))}
    </ol>
  );
}

function AccessMessage({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 dark:border-emerald-900 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{body}</p>
        <Link href={href} className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">{action}</Link>
      </div>
    </div>
  );
}
