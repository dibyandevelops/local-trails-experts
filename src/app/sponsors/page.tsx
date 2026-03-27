import type { Metadata } from 'next';
import Link from 'next/link';
import CollaborateForm from '@/components/feature-components/collaborate-form';

export const metadata: Metadata = {
  title: 'Sponsors',
  description:
    'Support trail stewardship in Nepal. Sponsor LocoXperts and showcase your brand to the outdoor community.',
  alternates: { canonical: '/sponsors' },
};

function SponsorSlot({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition ${
        featured
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 dark:border-emerald-900/60 dark:from-emerald-950/60 dark:via-slate-950/70 dark:to-emerald-900/40'
          : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900/60'
      }`}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl opacity-0 transition group-hover:opacity-100 dark:bg-emerald-700/25" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-white/70 text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-950/40 dark:text-emerald-100">
          <span className="text-xs font-semibold">LOGO</span>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
          Your company will be here
        </span>
      </div>
      <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">
        Sponsor a trail, an event series, signage, or community toolkits. We’ll
        feature your brand across the platform and partner updates.
      </p>
      <div className="mt-4 h-px w-full bg-gray-200/80 dark:bg-slate-800" />
      <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
        Interested? Use the collaboration form below.
      </p>
    </div>
  );
}

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
            Help sustain trails and grow local outdoor communities
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Sponsor trail stewardship in Nepal, community toolkits, and local expert
            certifications. Your support funds real work on the ground — and it’s
            visible on the platform.
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

        <div className="grid gap-5 md:grid-cols-3">
          <SponsorSlot featured />
          <SponsorSlot />
          <SponsorSlot />
          <SponsorSlot />
          <SponsorSlot />
          <SponsorSlot />
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Collaborate with us
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-slate-300">
            Share what you want to sponsor (trail stewardship, signage, toolkits,
            events, or expert programs). We’ll reply with next steps.
          </p>
        </div>
        <CollaborateForm />
      </section>
    </div>
  );
}
