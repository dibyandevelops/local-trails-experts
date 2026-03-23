import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kora 26 Cause — LocoXperts',
  description:
    'Ride the Kora to build sustainable trails, empower certified local experts, and grow outdoor tourism and community health.',
  alternates: { canonical: '/kora-26' },
};

function Badge({
  children,
  tone = 'emerald',
}: {
  children: React.ReactNode;
  tone?: 'emerald' | 'amber' | 'sky' | 'slate';
}) {
  const styles =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100'
      : tone === 'sky'
      ? 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100'
      : tone === 'slate'
      ? 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

export default function Kora26Page() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-10 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/25" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="emerald">Kora 26 Cause Proposal</Badge>
              <Badge tone="sky">Trail-Building</Badge>
              <Badge tone="amber">Local Experts</Badge>
              <Badge tone="slate">Community Health</Badge>
            </div>

            <h1 className="text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl">
              Ride the Kora to build the trails you&apos;ll ride for the rest of the
              year
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              LocoXperts is a community-first initiative to build sustainable
              mountain bike trails, empower certified local experts to lead guided
              rides, and create lasting impact through outdoor mobility.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/trails"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
              >
                Explore trails on LocoXperts
              </Link>
              <a
                href="/docs/Kora_26_Project_Proposal__LocoXperts.pdf"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base"
              >
                Download proposal PDF
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white/90 p-5 text-sm shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70 md:w-[360px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Purpose
            </p>
            <p className="mt-2 text-gray-700 dark:text-slate-200">
              Select LocoXperts as the official Kora 26 cause to:
            </p>
            <ul className="mt-3 space-y-2 text-gray-600 dark:text-slate-300">
              <li>• Build sustainable MTB trails that survive monsoon seasons.</li>
              <li>• Create local livelihoods through certified guided rides.</li>
              <li>• Promote health through active outdoor mobility.</li>
              <li>• Support critical health causes like cancer fundraising.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card
          title="Build & Restore Trails"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M5 17c3-2 5-2 8 0s5 2 6 1V6c-1 1-3 1-6-1S8 3 5 5v12Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          }
        >
          International-standard trail segments with beginner-friendly
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {' '}
            G-lines{' '}
          </span>
          and optional
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {' '}
            B-lines{' '}
          </span>
          that won&apos;t wash away each monsoon.
        </Card>

        <Card
          title="Boost Local Tourism"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 2a8 8 0 0 1 8 8c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 0 1 8-8Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Certify and empower village cyclists and mountain bikers as
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {' '}
            Local Experts{' '}
          </span>
          who can lead guided rides for visitors.
        </Card>

        <Card
          title="Protect the Ecosystem"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 2c3.5 4.1 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 2.5-6.9 6-11Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Professional trail-building reduces soil erosion and protects natural
          forests—while keeping routes safer and easier to maintain.
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            On-the-ground impact
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            If selected as the Kora 26 cause, funds raised will go toward:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <li>
              • The <span className="font-semibold">First Kilometer</span> pilot:
              a flagship, professionally mapped trail section.
            </li>
            <li>
              • Local toolkits + training for{' '}
              <span className="font-semibold">5 community partners</span> to
              maintain trails year-round.
            </li>
            <li>
              • Safety signage and trail markers so routes are accessible to
              beginners and visiting riders.
            </li>
          </ul>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-100 px-6 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-300 transition hover:bg-emerald-200 dark:bg-emerald-400 dark:text-emerald-950 dark:ring-emerald-300 dark:hover:bg-emerald-300"
            >
              Browse events
            </Link>
            <Link
              href="/experts/join"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
            >
              Apply as a Local Expert
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-900/40 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Simple fundraising message
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            “I am riding the Kora to raise funds for LocoXperts to build sustainable
            mountain bike trails and create jobs for local cycling guides in our
            hills.”
          </p>
          <p className="mt-4 text-sm text-emerald-100">
            This is tangible impact—people can see, touch, and ride the outcome of
            their fundraising.
          </p>
          <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-emerald-100">
            Already live: browse our trail mapping platform at{' '}
            <Link href="/trails" className="font-semibold text-white underline">
              locoxperts.com/trails
            </Link>
            .
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Sustainability beyond Kora 26
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              LocoXperts is designed as a self-sustaining ecosystem, not a one-time
              project.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
              <li>• Trails built will be listed on the LocoXperts platform.</li>
              <li>• Certified experts lead guided rides on those trails.</li>
              <li>
                • A portion of guided-ride fees returns to a trail-specific
                maintenance fund.
              </li>
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:w-[420px]">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                What&apos;s next
              </p>
              <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-100">
                Budget breakdown, timeline, and monitoring metrics (km built, local
                jobs, rider usage).
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Partners
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                Community trail stewards, volunteer builders, and local groups who
                ride and maintain these paths.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

