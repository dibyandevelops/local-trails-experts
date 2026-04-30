import type { Metadata } from 'next';
import Link from 'next/link';
import SponsorInquiryModal from '@/components/feature-components/sponsor-inquiry-modal';
import SponsorRequestModal from '@/components/feature-components/sponsor-request-modal';
import SponsorsShowcaseGrid from '@/components/feature-components/sponsors-showcase-grid';

export const metadata: Metadata = {
  title: 'Sponsors',
  description:
    'Sponsor the Nepal Trail Hub mission: map trails, build and fix routes across Nepal, and support local tourism and communities.',
  alternates: { canonical: '/sponsors' },
};

const SPONSOR_TIERS = [
  {
    name: 'Bronze',
    fit: 'Entry support',
    price: 'NPR 50,000 – 100,000 / year',
    highlight: 'Best for first-time community sponsors',
    deliverables: [
      'Logo placement on sponsor showcase',
      'Mention in monthly community update',
      'Contribution supports route mapping and documentation',
    ],
    color:
      'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30',
  },
  {
    name: 'Silver',
    fit: 'Growth support',
    price: 'NPR 100,000 – 200,000 / year',
    highlight: 'Best for brands seeking consistent local visibility',
    deliverables: [
      'Everything in Bronze',
      'Featured slot on trail/sponsor pages (rotational)',
      'Support allocation to signage and safety touchpoints',
    ],
    color:
      'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40',
  },
  {
    name: 'Gold',
    fit: 'Strategic partner',
    price: 'NPR 200,000+ / year',
    highlight: 'Best for long-term trail-hub partners',
    deliverables: [
      'Everything in Silver',
      'Priority brand placement on campaign pages',
      'Named support for trail workdays or route signage zones',
    ],
    color:
      'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30',
  },
];

export default function SponsorsPage() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-10 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/25" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Sponsors & Collaboration
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl">
            Fund the Nepal Trail Hub agenda with us
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Your sponsorship helps keep Nepal trails discoverable online and supports
            practical trail work across Nepal: route upgrades, trail fixes, signage, and local crews.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/purpose"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
            >
              See our purpose
            </Link>
            <Link
              href="/trails"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base"
            >
              Explore trails
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Sponsor showcase
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              These slots will feature sponsor logos and short highlights.
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Want to sponsor a trail or event series? Scroll to the form.
          </p>
        </div>

        <SponsorsShowcaseGrid />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Sponsorship tiers
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-slate-300">
            Structured tiers make commitments clear for both sides. We recommend fixed deliverables,
            transparent reporting, and quarterly review points for every sponsor.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {SPONSOR_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-2xl border p-5 shadow-sm ${tier.color}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-slate-300">
                {tier.fit}
              </p>
              <h3 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{tier.name}</h3>
              <p className="mt-1 inline-flex rounded-full border border-emerald-300 bg-white/80 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-slate-950/60 dark:text-emerald-200">
                {tier.price}
              </p>
              <p className="mt-2 text-sm font-medium text-gray-700 dark:text-slate-200">{tier.highlight}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
                {tier.deliverables.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <div className="mt-4">
                <SponsorInquiryModal
                  triggerLabel={`Choose ${tier.name}`}
                  initialTier={tier.name.toLowerCase() as 'bronze' | 'silver' | 'gold'}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p className="font-semibold">Best-practice governance</p>
          <p className="mt-1">
            Every tier follows the same baseline: clear scope, no guaranteed performance claims,
            and transparent updates on where support was allocated (mapping, signage, trail work, operations).
          </p>
          <p className="mt-2 text-xs text-emerald-800/90 dark:text-emerald-200/90">
            Price bands are guidance only and can be adjusted based on campaign scope, duration, and on-ground commitments.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SponsorInquiryModal triggerLabel="Start sponsorship inquiry" />
          <SponsorRequestModal triggerLabel="Submit sponsor request" />
        </div>
      </section>
    </div>
  );
}
