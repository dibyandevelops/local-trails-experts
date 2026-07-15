import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const StoreLocatorClient = dynamic(
  () => import('@/components/feature-components/store-locator/store-locator-client'),
  {
    loading: () => (
      <div className="grid min-h-[420px] place-items-center rounded-3xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Loading cycle hubs map...
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: 'Cycle Hubs',
  description:
    'Find trusted bike shops, repair points, and support hubs across Nepal.',
  alternates: { canonical: '/store-locator' },
};

export default function StoreLocatorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-6 dark:border-emerald-800/50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/40 sm:px-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                Cycle Hubs
              </span>
              <span className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                Nepal
              </span>
            </div>
            <h1 className="text-balance text-3xl font-extrabold text-gray-950 dark:text-slate-50 sm:text-4xl">
              Find bike shops and trail support nearby
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
              Discover repair points, rental partners, gear shops, and local support hubs before you ride.
            </p>
          </div>
          <div className="grid gap-2 text-xs text-emerald-900 dark:text-emerald-100 sm:grid-cols-3 lg:max-w-md">
            <div className="rounded-2xl border border-emerald-200 bg-white/80 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              Repairs
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              Rentals
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white/80 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              Local support
            </div>
          </div>
        </div>
      </section>

      <StoreLocatorClient />
    </div>
  );
}
