import Link from 'next/link';
import JoinAdventureButton from '@/components/home/join-adventure-button';
import RideWithLocalExpertsCta from '@/components/home/ride-with-local-experts-cta';
import { COMMUNITY_NAME } from '@/lib/branding';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
// import PhoneVerifyToast from '@/components/phone-verify-toast';

export default function Home() {
  return (
    <div className="space-y-14 md:space-y-16">
      {/* <PhoneVerifyToast /> */}
      <section className="reveal reveal-1 relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-10 shadow-sm md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

        <div className="relative grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div className="text-left">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Nepal Trails
              </span>
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Local Experts
              </span>
              {EXPERTS_BETA_ENABLED && (
                <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                  For Experts ( Beta )
                </span>
              )}
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Community First
              </span>
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Support Local Tourism
              </span>
            </div>
            <h1 className="mb-4 text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl lg:text-6xl">
              Find trails and local guides across Nepal.
            </h1>
            <p className="mb-6 max-w-xl text-base text-gray-600 dark:text-gray-300 md:text-lg">
              Search by place, view clear trail details, and join rides with local experts.
              We keep trail info simple, practical, and community-driven.
            </p>
            <div className="mb-6 flex flex-wrap gap-3">
              <Link
                href="/trails"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-emerald-100 px-7 py-3 text-sm font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-300 transition hover:bg-emerald-200 dark:bg-emerald-400 dark:text-emerald-950 dark:ring-emerald-300 dark:hover:bg-emerald-300 md:text-base"
              >
                Browse Trails
              </Link>
              <Link
                href="/community-rides"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
              >
                Join Community Rides
              </Link>
              <Link
                href="/store-locator"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-100 dark:ring-emerald-700/60 dark:hover:bg-emerald-950/30 md:text-base"
              >
                Cycle Hubs
              </Link>
              <JoinAdventureButton className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base" />
              <Link
                href="/trails"
                className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-emerald-300 bg-white px-7 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-950/30 md:text-base"
              >
                Request Trail Ride
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 dark:border-emerald-900 dark:bg-slate-900/90">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Featured City</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Kathmandu Routes</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 dark:border-emerald-900 dark:bg-slate-900/90">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Nepal Wide</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Popular Routes</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 dark:border-emerald-900 dark:bg-slate-900/90">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Local Experts</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Guides & Coaches</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 dark:border-emerald-900 dark:bg-slate-900/90">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Trail Updates</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Latest Conditions</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200/70 bg-white/90 p-5 shadow-sm dark:border-emerald-900 dark:bg-slate-900/90">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Start Here
              </p>
              <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <div className="flex items-start gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-green-600" />
                  Browse trails with distance, climb, and difficulty.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-green-600" />
                  Join group rides or training events.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-green-600" />
                  Request a custom ride with a local expert.
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-green-900 to-emerald-950 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                Built for experts
              </p>
              {EXPERTS_BETA_ENABLED && (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                  Beta feature: workflows may change.
                </p>
              )}
              <h3 className="mt-3 text-lg font-semibold">
                Turn your local trail knowledge into events.
              </h3>
              <p className="mt-2 text-sm text-emerald-100">
                Create rides, organize training sessions, and grow your local community.
              </p>
              <Link
                href="/experts/join"
                className="mt-4 inline-flex text-sm font-semibold text-emerald-100 underline-offset-4 hover:underline"
              >
                Start your expert application →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal reveal-2 space-y-6">
        <div className="reveal reveal-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            Riders & Adventurers
          </span>
          <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Find a trail that fits your level.
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            See the key details first, then decide where to ride.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
              MTB and mixed-surface routes across Nepal.
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
              Community-led rides in local areas.
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
              Training and skill-based rides.
            </div>
          </div>
          <div className="mt-5">
            <RideWithLocalExpertsCta />
          </div>
        </div>

        <div className="reveal reveal-4 rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-green-900 to-emerald-950 p-6 text-white shadow-sm">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            Cycle Hubs & Support
          </span>
          <h2 className="mt-3 text-lg font-semibold">
            Find bike shops, service points, and ride support.
          </h2>
          <p className="mt-2 text-sm text-emerald-100">
            Use Cycle Hubs to locate repairs, parts, and pre-ride help.
          </p>
          <div className="mt-4 space-y-2 text-sm text-emerald-100">
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-200" />
              Map-based shop listings with directions.
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-200" />
              Community listings with admin review.
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-200" />
              Simple form for stores to join.
            </div>
          </div>
          <Link
            href="/store-locator"
            className="mt-4 inline-flex text-sm font-semibold text-emerald-100 underline-offset-4 hover:underline"
          >
            Browse cycle hubs →
          </Link>
        </div>

        <div className="reveal reveal-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            Nepal Focus
          </span>
          <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            One place for trails, rides, and local guidance.
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Built for Nepal riders who want clear trail information without extra noise.
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
              Filter by place, category, and difficulty.
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
              Check distance, climb, and map quickly.
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
              Join rides and manage booking in one flow.
            </div>
          </div>
        </div>
      </section>

      <section className="reveal reveal-6 rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-green-50 to-sky-50 p-6 dark:border-emerald-900/60 dark:from-green-950/40 dark:to-sky-950/30 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              Project Purpose
            </span>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Why this platform exists
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              We help riders find trails, help experts run rides, and keep the platform running
              with sponsor and community support.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/sponsors"
                className="inline-flex items-center rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
              >
                Sponsor the platform
              </Link>
              <Link
                href="/donate"
                className="inline-flex items-center rounded-full border border-green-700 px-5 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30"
              >
                Contribute to community
              </Link>
              <Link
                href="/purpose"
                className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-950/30"
              >
                Read full purpose
              </Link>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-xl border border-emerald-200 bg-white/80 p-4 text-xs text-gray-600 shadow-sm dark:border-emerald-900 dark:bg-slate-900/80 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Built by {COMMUNITY_NAME}</p>
            <p className="mt-2">
              Local experts, riders, stores, and supporters working together to keep Nepal trails active and easier to discover.
            </p>
          </div>
        </div>
      </section>

      <section className="reveal reveal-7 flex flex-col items-center justify-between gap-6 rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-green-50 to-sky-50 p-6 dark:border-emerald-900/60 dark:from-green-950/40 dark:to-sky-950/30 md:flex-row md:p-10">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            Training & Performance
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Training rides with local coaches.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-gray-600 dark:text-gray-300">
            Join skill rides, endurance sessions, and guided practice rides.
          </p>
          <Link
            href="/events?sport=training"
            className="mt-5 inline-flex items-center rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
          >
            See training events
          </Link>
        </div>
        <div className="max-w-xs rounded-xl border border-emerald-200 bg-white/80 p-4 text-xs text-gray-500 shadow-sm dark:border-emerald-900 dark:bg-slate-900/80 dark:text-gray-400">
          We are continuously improving safety updates, route quality, and ride planning tools.
        </div>
      </section>
    </div>
  );
}
