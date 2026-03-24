import type { Metadata } from 'next';
import GroupRequestForm from '@/components/feature-components/group-request-form';

export const metadata: Metadata = {
  title: 'Large Group Request',
  description:
    'Request a large group ride, hike, run, or tour. Choose a trail and tell us your group size, preferred date, and logistics.',
  alternates: { canonical: '/group-request' },
};

export default function GroupRequestPage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-10 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/25" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Organize a Large Group
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl">
            Request a custom group experience
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Planning a big ride, training block, corporate outing, or travel
            group? Choose a trail (optional) and tell us the details — we’ll
            coordinate the right host and logistics.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
        <GroupRequestForm />
      </section>
    </div>
  );
}

