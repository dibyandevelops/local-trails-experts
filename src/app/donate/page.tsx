import type { Metadata } from 'next';
import Link from 'next/link';
import { COMMUNITY_NAME } from '@/lib/branding';

export const metadata: Metadata = {
  title: 'Donate',
  description:
    `Support ${COMMUNITY_NAME} to map trails across Nepal and fund trail building, fixes, and route signage.`,
  alternates: { canonical: '/donate' },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
      {children}
    </h2>
  );
}

export default function DonatePage() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-10 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/25" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Fundraising
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl">
            Raise for better maps, better trails, and stronger local communities
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Your contribution supports the three core buckets: keeping LocoXperts free and
            updated as a map platform, funding tools and local trail crews, and installing
            clear route signage for safer navigation.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#community-fund"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
            >
              Support community fundraising
            </Link>
            <Link
              href="/campaigns"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base"
            >
              Support campaigns
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div id="community-fund" className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
          <SectionTitle>Donate via eSewa (QR)</SectionTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            Scan the QR code to get the payment details for the LocoXperts Trail Fund.
          </p>

          <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/40 sm:flex-row sm:items-start">
            <div className="w-full max-w-[220px] overflow-hidden rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-950">
              {/* SVG is generated in public/donate/esewa-qr.svg */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/donate/esewa-qr.svg"
                alt="eSewa donation QR code for the LocoXperts Trail Fund"
                className="h-auto w-full"
              />
            </div>
            <div className="w-full">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                LocoXperts Trail Fund
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                Funds support the map platform, the dirt work, and clear trail signs
                that make Nepal routes easier to navigate.
              </p>
              <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                Prefer a receipt or want your donation acknowledged publicly? Use the
                collaboration form and share your transaction reference.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
          <SectionTitle>How {COMMUNITY_NAME} operates</SectionTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            This is the day-to-day work that keeps the Nepal Trail Hub mission practical
            and community-led.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <li>• Weekly community rides and route scouting.</li>
            <li>• Trail stewardship: clearing, minor repairs, drainage checks, route shaping.</li>
            <li>• Safety-first culture: helmet norms, group protocols, and basic preparedness.</li>
            <li>• Mapping/documentation: GPX recording, difficulty notes, meeting points, route visibility.</li>
            <li>• Community coordination: scheduling, volunteer trail days, and partnerships.</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
            Want to support in-kind (tools, gloves, signage, water, first aid) or
            support a trail day?{' '}
            <Link href="/campaigns" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200">
              Support campaigns →
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
        <SectionTitle>Transparency (recommended)</SectionTitle>
        <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-slate-300">
          We follow practical transparency standards so contributors can trust where
          funds go and how decisions are made.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-gray-700 dark:text-slate-200">
          <li>• Publish a monthly summary of funds received and key expenses.</li>
          <li>• Share a clear allocation split (trail work, safety gear, platform upkeep).</li>
          <li>• Keep basic proof for expenses (receipts, invoices, trail-day logs).</li>
          <li>• Report outcomes, not just spending (trails maintained, rides supported).</li>
          <li>• Separate community fund usage from personal accounts and payouts.</li>
          <li>• Disclose sponsor relationships and any material conflicts of interest.</li>
        </ul>
      </section>
    </div>
  );
}
