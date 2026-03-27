import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Purpose',
  description:
    'LocoXperts builds sustainable trails and empowers certified local experts to lead guided rides and trainings, supporting community health and conservation.',
  alternates: { canonical: '/purpose' },
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
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      <div className="text-sm text-gray-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

export default function PurposePage() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-10 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/25" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="emerald">Sustainable Trails</Badge>
            <Badge tone="amber">Local Experts</Badge>
            <Badge tone="sky">Tourism & Livelihoods</Badge>
            <Badge tone="slate">Health & Conservation</Badge>
          </div>

          <h1 className="text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl">
            A trail platform built to create real-world impact
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            LocoXperts is a hybrid digital + community initiative: we map routes
            and host events, while working with local communities to build and
            maintain sustainable trails and empower certified experts to lead
            guided rides and trainings.
          </p>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Current focus area: Nepal. We’ll expand to new regions as community
            partners and sponsors come onboard.
          </p>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            The platform is designed to be autonomous: experts publish trails,
            host events, and keep their earnings. LocoXperts focuses on trail
            stewardship and safety guidance, not taking a cut from expert income.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/trails"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
            >
              Browse trails
            </Link>
            <Link
              href="/events"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base"
            >
              Browse events
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card
          title="Build & restore trails"
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
          Create international-standard, sustainable cycling trails with
          beginner-friendly main lines and optional alternates designed to hold
          up in monsoon conditions.
        </Card>
        <Card
          title="Empower local experts"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 2a8 8 0 0 1 8 8c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 0 1 8-8Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Certify and support local cyclists and communities so they can host
          guided rides, trainings, and tours—creating sustainable income through
          outdoor experiences.
        </Card>
        <Card
          title="Protect health & nature"
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M12 2c3.5 4.1 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 2.5-6.9 6-11Z"
                fill="currentColor"
              />
            </svg>
          }
        >
          Trail stewardship done right helps prevent erosion and protect forests—
          while encouraging healthier lifestyles through active outdoor mobility
          and community rides.
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            How expert verification scales
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            We can’t manually verify every expert. The platform uses a layered
            system: community reviews, verification details, and admin checks
            for higher-trust roles.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <p>• Community verified: reviews and completion history</p>
            <p>• Safety & certifications: optional proof for higher trust</p>
            <p>• Admin review for “Verified Expert” status</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Responsibility & safety
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            LocoXperts acts as a bulletin board connecting participants with
            independent experts. We provide safety guidance, but experts run
            their own events and participants are responsible for their choices.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <p>• Mandatory risk acknowledgment before booking</p>
            <p>• Trail reporting and incident feedback for continuous safety</p>
            <p>• Clear expectations for experts and participants</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/60 dark:via-slate-950/70 dark:to-emerald-900/40 md:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Funding model
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Sponsor-funded trails, expert-led experiences
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            We don’t take a cut from expert events. Instead, local companies and
            partners fund trail stewardship through sponsorship tiers.
            Experts keep their earnings, while sponsors help sustain the trail network.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <p>• Adopt-a-trail sponsorships (signage, stewardship, safety upgrades)</p>
            <p>• Community toolkits and local crew support</p>
            <p>• Long-term vision: new trail development when local teams are ready</p>
            <p>• Partner visibility on trail pages and on-ground signage</p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sponsors"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800"
            >
              Sponsor a trail
            </Link>
            <Link
              href="/donate"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-green-700 px-6 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30"
            >
              Donate to the trail fund
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            What we build (offline) + what we ship (online)
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            The platform makes trails discoverable and events easy to join. The
            community work keeps routes safe, sustainable, and rideable.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
            <p>
              • <span className="font-semibold">Offline:</span> Trail construction,
              signage, community toolkits, and training for long-term
              maintenance.
            </p>
            <p>
              • <span className="font-semibold">Online:</span> Route discovery,
              expert profiles, event listings, and a marketplace for guided
              experiences.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/experts"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-emerald-100 px-6 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-300 transition hover:bg-emerald-200 dark:bg-emerald-400 dark:text-emerald-950 dark:ring-emerald-300 dark:hover:bg-emerald-300"
            >
              Meet local experts
            </Link>
            <Link
              href="/sponsors"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
            >
              Sponsor / collaborate
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-900/40 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Long-term sustainability
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            The goal isn&apos;t a one-time project—it&apos;s an ecosystem.
          </p>
          <p className="mt-4 text-sm text-emerald-100">
            Trails built by communities are listed on the platform. Certified
            experts lead rides and trainings on those trails. A portion of guided
            experience revenue can support trail upkeep and maintenance over
            time.
          </p>
        </div>
      </section>
    </div>
  );
}
