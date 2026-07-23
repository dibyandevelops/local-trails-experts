import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  HandHeart,
  Megaphone,
  ShoppingBag,
  Wrench,
} from 'lucide-react';
import { ORGANIZATION_SUBSCRIPTION_PRICE_NPR } from '@/lib/organization-subscriptions';

export const metadata: Metadata = {
  title: 'LocoXperts Partner Plan for Cycling Organizations',
  description:
    'Subscribe your cycling organization to publish services, marketplace items, and campaigns on LocoXperts.',
};

const unlocks = [
  {
    icon: ShoppingBag,
    title: 'Marketplace visibility',
    body: 'List cycles, parts, accessories, rentals, and useful riding gear from your organization.',
  },
  {
    icon: Wrench,
    title: 'Cycling services',
    body: 'Publish guiding, repair, shuttle, photography, coaching, rental, and event-support services.',
  },
  {
    icon: HandHeart,
    title: 'Campaigns',
    body: 'Create public support campaigns for trail work, community rides, local programs, and cycling projects.',
  },
  {
    icon: CalendarDays,
    title: 'Partner profile boost',
    body: 'Subscribed verified partners appear ahead in the organization directory with a clear partner badge.',
  },
  {
    icon: Megaphone,
    title: 'Monthly promotion slot',
    body: 'Highlight one service, event, marketplace item, or campaign from your public organization profile each month.',
  },
];

const idealFor = [
  'Local guides and ride leaders',
  'Bike shops and cycle hubs',
  'Trail builders and maintenance groups',
  'Cycling service providers',
  'Event organizers and community teams',
  'Tour, training, and rental operators',
];

const steps = [
  'Create or connect your organization.',
  'Submit the monthly subscription payment.',
  'Admin verifies the payment and organization.',
  'Start publishing services, marketplace items, and campaigns.',
];

export default function OrganizationSubscriptionLandingPage() {
  const price = `NPR ${ORGANIZATION_SUBSCRIPTION_PRICE_NPR.toLocaleString()}`;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 text-gray-900 dark:text-slate-100">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Building2 className="h-3.5 w-3.5" />
              For cycling organizations
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-normal text-gray-950 dark:text-white sm:text-5xl">
              LocoXperts Partner Plan
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-slate-300">
              Turn your local cycling work into bookable services, marketplace visibility, and public campaigns for riders across Nepal.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/organizations/create" className="inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-emerald-950">
                Create organization
              </Link>
              <Link href="/organizations/me/subscription" className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                Subscribe existing organization
              </Link>
            </div>
          </div>
          <aside className="border-t border-emerald-900/10 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30 lg:border-l lg:border-t-0 lg:p-8">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/60 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Partner Plan
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-black text-gray-950 dark:text-white">{price}</span>
                <span className="pb-1 text-sm font-semibold text-gray-500 dark:text-slate-400">/ month</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
                One plan for verified organizations that want to publish paid services, marketplace items, campaigns, and a monthly partner spotlight.
              </p>
              <div className="mt-5 space-y-2">
                {['Verified organization profile', 'Services and marketplace publishing', 'Campaign publishing eligibility', 'Partner boost and monthly promotion', 'Manual payment review'].map((item) => (
                  <p key={item} className="flex gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {unlocks.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Icon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
              <h2 className="mt-4 text-lg font-bold text-gray-950 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{item.body}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">Who this is for</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {idealFor.map((item) => (
              <p key={item} className="flex gap-2 rounded-xl border border-gray-100 p-3 text-sm font-semibold text-gray-700 dark:border-slate-800 dark:text-slate-200">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">How it works</h2>
          <ol className="mt-5 grid gap-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl border border-gray-100 p-3 text-sm text-gray-700 dark:border-slate-800 dark:text-slate-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <CircleDollarSign className="h-4 w-4" />
              Ready to publish your organization’s work?
            </p>
            <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-white">
              Start with one organization and one clear offer.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700 dark:text-slate-300">
              You can create the organization first, then submit the subscription payment from the organization dashboard after admin access is ready.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/organizations/create" className="inline-flex justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-emerald-950">
              Create organization
            </Link>
            <Link href="/organizations" className="inline-flex justify-center rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200">
              View organizations
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
