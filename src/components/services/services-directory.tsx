'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Camera, Globe2, Laptop, Mail, MapPinned, Megaphone, Palette, Search, TrendingUp, Truck, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SERVICE_CATEGORIES, getServiceCategoryLabel } from '@/services/constants/organization-services';
import ServiceBookingButton from '@/components/feature-components/organizations/service-booking-button';

export type OrganizationService = {
  id: string;
  organization_id: string;
  category: string;
  title: string;
  description: string | null;
  price_npr: number | null;
  price_note: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  image_url: string | null;
  is_active: boolean;
  organization_name: string;
  organization_slug: string;
  organization_logo_url: string | null;
  organization_is_verified: boolean;
  organization_whatsapp_url: string | null;
  organization_contact_phone: string | null;
};

const BUSINESS_SERVICES = [
  {
    title: 'Websites and online stores',
    description: 'Plan, build, refresh, and maintain a mobile-friendly website or online store that helps customers understand and choose your business.',
    icon: Globe2,
  },
  {
    title: 'Google Maps and local presence',
    description: 'Set up or improve your Google Business Profile, map listing, business hours, photos, and local search information.',
    icon: MapPinned,
  },
  {
    title: 'Sales and customer systems',
    description: 'Make it easier to capture enquiries, follow up leads, manage customer relationships, and see where sales are coming from.',
    icon: TrendingUp,
  },
  {
    title: 'Digital marketing and SEO',
    description: 'Improve how customers find you with practical search optimization, content planning, and digital campaign support.',
    icon: Megaphone,
  },
  {
    title: 'Small-business IT support',
    description: 'Get help choosing and setting up business tools, email, cloud services, and everyday technology workflows.',
    icon: Laptop,
  },
] as const;

function ServiceIcon({ category }: { category: string }) {
  const Icon = category === 'ride_photography' ? Camera : category === 'creative_design' ? Palette : category === 'shuttle_transport' ? Truck : Wrench;
  return <Icon className="h-5 w-5" />;
}

async function fetchServices(category: string, search: string): Promise<OrganizationService[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search.trim()) params.set('q', search.trim());
  const response = await fetch(`/api/services?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load services.');
  return data.services || [];
}

export default function ServicesDirectory() {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'locoxperts@gmail.com';
  const query = useQuery({ queryKey: ['organization-services-public', category, search], queryFn: () => fetchServices(category, search), staleTime: 60_000 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-950 dark:to-cyan-950/30"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Local expertise for hire</p><h1 className="mt-2 text-4xl font-black text-gray-950 dark:text-white">Services for businesses and better rides</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">Digital and IT support for small and medium businesses, alongside local cycling services and community providers.</p></header>
      <section aria-labelledby="business-services-heading" className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">For small and medium businesses</p>
            <h2 id="business-services-heading" className="mt-1 text-2xl font-black text-gray-950 dark:text-white">Practical digital services from LocoXperts</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">From getting found online to organizing leads and everyday technology, we can help shape a setup that fits your business.</p>
          </div>
          <a href={`mailto:${contactEmail}?subject=Small%20business%20digital%20services`} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Talk to us
          </a>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_SERVICES.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-gray-950 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="provider-directory-heading" className="mt-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Community directory</p>
          <h2 id="provider-directory-heading" className="mt-1 text-2xl font-black text-gray-950 dark:text-white">Services from local organizations</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">Browse published cycling and business service listings from verified organizations.</p>
        </div>
      </section>
      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search services</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search service, location, or organization" className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><select aria-label="Service category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All services</option>{SERVICE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></section>
      {query.isLoading ? <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-3xl bg-gray-200 dark:bg-slate-800" />)}</div> : query.error ? <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">{query.error.message}</p> : query.data?.length ? <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{query.data.map((service) => <article key={service.id} className="flex flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">{service.image_url && <img src={service.image_url} alt="" className="h-40 w-full object-cover" />}<div className="flex flex-1 flex-col p-5"><Link href={`/organizations/${service.organization_slug}`} className="mb-3 inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70"><span className="truncate">{service.organization_name}</span>{!service.organization_is_verified && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Pending</span>}</Link><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"><ServiceIcon category={service.category} />{getServiceCategoryLabel(service.category)}</div><h3 className="mt-3 text-xl font-black text-gray-950 dark:text-white">{service.title}</h3>{service.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">{service.description}</p>}<div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-slate-200"><p className="font-bold">{service.price_npr !== null ? `From NPR ${service.price_npr.toLocaleString()}` : service.price_note || 'Contact for pricing'}</p>{service.price_note && service.price_npr !== null && <p className="text-xs text-gray-500 dark:text-slate-400">{service.price_note}</p>}{service.location && <p className="text-xs text-gray-500 dark:text-slate-400">{service.location}</p>}</div><div className="mt-auto flex flex-wrap items-start gap-2 pt-5"><ServiceBookingButton serviceId={service.id} serviceTitle={service.title} organizationName={service.organization_name} organizationPhone={service.contact_phone || service.organization_contact_phone} organizationWhatsappUrl={service.organization_whatsapp_url} />{service.website_url && <a href={service.website_url} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-200">Details</a>}</div></div></article>)}</section> : <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">No organization service listings match these filters yet. You can contact LocoXperts about the business services above.</p>}
    </div>
  );
}
