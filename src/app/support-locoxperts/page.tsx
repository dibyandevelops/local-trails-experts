import type { Metadata } from 'next';
import Link from 'next/link';
import { COMMUNITY_NAME } from '@/lib/branding';

export const metadata: Metadata = {
  title: 'Support LocoXperts',
  description:
    `Support ${COMMUNITY_NAME} so the platform can stay alive, improve, and remain useful for local riders.`,
  alternates: { canonical: '/support-locoxperts' },
};

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <header className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-8 shadow-sm dark:border-emerald-900/70 dark:from-slate-950 dark:via-emerald-950/40 dark:to-lime-950/20 md:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/45 blur-3xl dark:bg-emerald-500/15" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
            Keep it running
          </p>
          <h1 className="mt-3 text-balance text-3xl font-black text-gray-950 dark:text-white md:text-5xl">
            Help keep LocoXperts alive.
          </h1>
          <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-slate-300 md:text-base">
            If LocoXperts helps you find trails, experts, events, or nearby ride support, you can
            support the developer behind it.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section id="platform-support" className="scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="text-lg font-black text-gray-950 dark:text-white">Scan to support</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700">
            <div className="aspect-square overflow-hidden rounded-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src=""
                alt="eSewa QR code for supporting LocoXperts platform upkeep"
                className="h-full w-full object-cover object-[50%_23%]"
              />
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">
            eSewa support for LocoXperts platform upkeep
          </p>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 lg:mt-8">
          <h2 className="text-lg font-black text-gray-950 dark:text-white">What this supports</h2>
          <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-slate-300">
            This is for platform upkeep: hosting, fixes, maintenance, and developer time to keep
            improving LocoXperts.
          </p>
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            Trail-building donations are separate. Use campaign pages when you want to support a
            specific trail or organization.
          </p>
          <Link
            href="/campaigns"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300 bg-white px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100 dark:hover:bg-emerald-950/30"
          >
            View trail campaigns
          </Link>
        </section>
      </div>
    </div>
  );
}
