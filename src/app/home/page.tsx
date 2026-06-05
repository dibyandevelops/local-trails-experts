import type { Metadata } from 'next';
import Link from 'next/link';
import JoinAdventureButton from '@/components/home/join-adventure-button';
import { COMMUNITY_NAME } from '@/lib/branding';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import { absoluteUrl, DEFAULT_DESCRIPTION } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'Best Site to View MTB Trails in Nepal',
  description:
    'Discover mountain bike trails in Nepal with GPX-ready route guides, local expert support, and easy event booking.',
  keywords: [
    'best MTB trails in Nepal',
    'mountain bike trails Nepal',
    'Nepal MTB trail map',
    'bike routes Nepal',
    'trail discovery Nepal',
    'local cycling guides Nepal',
    'local trail guides Nepal',
    'LocoXperts',
  ],
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'Best Site to View MTB Trails in Nepal',
    description:
      'Discover mountain bike trails in Nepal with GPX-ready route guides, local expert support, and easy event booking.',
    url: '/home',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Best Site to View MTB Trails in Nepal',
    description:
      'Discover mountain bike trails in Nepal with GPX-ready route guides, local expert support, and easy event booking.',
  },
};

const quickSearches = [
  { label: 'Pharping', href: '/trails?search=pharping' },
  { label: 'Enduro trails', href: '/trails?sport=mtb&search=enduro' },
  { label: 'Beginner friendly', href: '/trails?difficulty=easy' },
  { label: 'Near Kathmandu', href: '/trails?location=Kathmandu' },
  { label: 'Trail builders', href: '/organizations' },
];

const featuredTrails = [
  {
    title: 'Ride Kathmandu Valley trails',
    description: 'Search mapped routes around Kathmandu, Lalitpur, Bhaktapur, and nearby ridgelines.',
    href: '/trails?location=Kathmandu',
    meta: 'Local routes',
  },
  {
    title: 'Find enduro-style rides',
    description: 'Look for longer descents, technical sections, and trails built for serious MTB sessions.',
    href: '/trails?search=enduro',
    meta: 'MTB focus',
  },
  {
    title: 'Start with easier routes',
    description: 'Filter beginner-friendly options before moving into harder trails and expert-led rides.',
    href: '/trails?difficulty=easy',
    meta: 'New riders',
  },
];

const discoveryPaths = [
  {
    title: 'Trails',
    description: 'Search routes by place, difficulty, distance, and ride profile.',
    href: '/trails',
    cta: 'Browse trails',
  },
  {
    title: 'Local Experts',
    description: 'Find verified riders and guides who know local routes and conditions.',
    href: '/experts',
    cta: 'Browse experts',
  },
  {
    title: 'Trail Builders',
    description: 'See organizations building, maintaining, and supporting Nepal trails.',
    href: '/organizations',
    cta: 'View builders',
  },
  {
    title: 'Campaigns',
    description: 'Support active trail work, maintenance, and local riding infrastructure.',
    href: '/campaigns',
    cta: 'Support campaigns',
  },
];

const planningSteps = [
  'Search a trail or place.',
  'Check route guide, map, difficulty, alerts, and services.',
  'Request ride support or join an expert-led event.',
];

export default function Home() {
  const websiteJsonLd = jsonLdStringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'LocoXperts',
    url: absoluteUrl('/home'),
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/trails')}?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });

  return (
    <div className="space-y-10 pb-8 md:space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
      />

      <section className="reveal reveal-1 relative overflow-hidden rounded-[2rem] border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-8 shadow-sm dark:border-emerald-800/60 dark:from-slate-950 dark:via-emerald-950/45 dark:to-lime-950/25 dark:shadow-emerald-950/30 md:px-10 md:py-12 lg:px-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-hero-glow/40 blur-3xl dark:bg-emerald-400/15" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-lime-400/10" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(16,185,129,0.16)_1px,transparent_0)] [background-size:34px_34px] dark:opacity-30 dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(110,231,183,0.2)_1px,transparent_0)]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text dark:border-emerald-700/60 dark:bg-emerald-900/35 dark:text-emerald-100">
              Nepal Trail Search
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text dark:border-emerald-700/60 dark:bg-emerald-900/35 dark:text-emerald-100">
              Experts
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text dark:border-emerald-700/60 dark:bg-emerald-900/35 dark:text-emerald-100">
              Trail Builders
            </span>
            {EXPERTS_BETA_ENABLED && (
              <span className="rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Expert beta
              </span>
            )}
          </div>

          <h1 className="text-balance text-4xl font-black leading-tight text-gray-950 dark:text-gray-100 md:text-6xl lg:text-7xl">
            Find trails, experts, and ride support in Nepal.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300 md:text-lg">
            Search by trail, place, builder, or riding style. Open route maps, check safety context,
            and connect with local experts when you need support.
          </p>

          <form
            action="/trails"
            method="get"
            className="mx-auto mt-7 max-w-3xl rounded-2xl border border-white/80 bg-white/90 p-2 shadow-lg shadow-emerald-950/10 backdrop-blur dark:border-emerald-700/50 dark:bg-slate-950/75 dark:shadow-emerald-950/40"
          >
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <label htmlFor="home-trail-search" className="sr-only">
                Search trails
              </label>
              <input
                id="home-trail-search"
                name="search"
                type="search"
                placeholder="Search Pharping, Chitlang, enduro, Kathmandu..."
                className="min-h-[54px] w-full rounded-xl border border-transparent bg-transparent px-4 text-base font-semibold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-300 dark:text-slate-50 dark:placeholder:text-emerald-100/40 dark:focus:border-emerald-500/70"
              />
              <button
                type="submit"
                className="min-h-[54px] rounded-xl bg-green-700 px-7 text-sm font-bold text-white transition hover:bg-green-800 dark:border dark:border-lime-300/45 dark:bg-lime-300/15 dark:text-lime-50 dark:hover:bg-lime-300/25"
              >
                Search trails
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {quickSearches.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:border-emerald-500/70 dark:hover:bg-emerald-900/45"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal reveal-2 grid gap-4 md:grid-cols-3">
        {featuredTrails.map((trail, index) => (
          <Link
            key={trail.title}
            href={trail.href}
            className={`group relative min-h-[230px] overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
              index === 1
                ? 'border-emerald-900/60 bg-gradient-to-br from-green-900 to-emerald-950 text-white dark:border-emerald-700/60 dark:from-emerald-950 dark:via-green-950 dark:to-slate-950'
                : 'border-gray-200 bg-white dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900'
            }`}
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-300/30 blur-2xl dark:bg-emerald-400/10" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    index === 1
                      ? 'bg-white/10 text-emerald-100'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                  }`}
                >
                  {trail.meta}
                </span>
                <h2
                  className={`mt-4 text-xl font-bold ${
                    index === 1 ? 'text-white' : 'text-gray-950 dark:text-white'
                  }`}
                >
                  {trail.title}
                </h2>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    index === 1 ? 'text-emerald-100' : 'text-gray-600 dark:text-slate-300'
                  }`}
                >
                  {trail.description}
                </p>
              </div>
              <span
                className={`mt-6 text-sm font-semibold ${
                  index === 1 ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                Explore now →
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="reveal reveal-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
              Discover
            </span>
            <h2 className="mt-3 text-2xl font-bold text-gray-950 dark:text-white">
              Choose what you need today
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
              The homepage should work like a launchpad: search trails first, then move into expert
              support, builders, campaigns, and ride infrastructure.
            </p>
          </div>
          <JoinAdventureButton className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-green-700 px-5 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-lime-300/45 dark:bg-lime-300/10 dark:text-lime-50 dark:hover:bg-lime-300/20" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {discoveryPaths.map((path) => (
            <Link
              key={path.title}
              href={path.href}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white dark:border-emerald-900/45 dark:bg-slate-950/65 dark:hover:border-emerald-700/70 dark:hover:bg-emerald-950/25"
            >
              <h3 className="text-base font-bold text-gray-950 dark:text-white">{path.title}</h3>
              <p className="mt-2 min-h-[66px] text-sm leading-6 text-gray-600 dark:text-slate-300">
                {path.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {path.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="reveal reveal-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-emerald-900/60 bg-gradient-to-br from-green-900 to-emerald-950 p-6 text-white shadow-sm dark:border-emerald-700/60 dark:from-emerald-950 dark:via-green-950 dark:to-slate-950 md:p-7">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            Plan better
          </span>
          <h2 className="mt-4 text-2xl font-bold">From search to ride plan.</h2>
          <div className="mt-5 space-y-4">
            {planningSteps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-black text-emerald-950">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-emerald-100">{step}</p>
              </div>
            ))}
          </div>
          <Link
            href="/trails"
            className="mt-6 inline-flex rounded-full border border-lime-300/45 bg-lime-300/15 px-5 py-2.5 text-sm font-bold text-lime-50 transition hover:bg-lime-300/25"
          >
            Start with trails
          </Link>
        </div>

        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-green-50 to-sky-50 p-6 dark:border-emerald-800/60 dark:from-slate-950 dark:via-emerald-950/35 dark:to-sky-950/25 md:p-7">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            Community infrastructure
          </span>
          <h2 className="mt-4 text-2xl font-bold text-gray-950 dark:text-white">
            Trails need more than maps.
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
            LocoXperts connects route information with experts, trail builders, campaigns,
            services, and cycle hubs so riders can make better decisions before they go.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/store-locator"
              className="rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm font-semibold text-emerald-900 hover:bg-white dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-100 dark:hover:bg-emerald-900/35"
            >
              Find cycle hubs →
            </Link>
            <Link
              href="/events"
              className="rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm font-semibold text-emerald-900 hover:bg-white dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-100 dark:hover:bg-emerald-900/35"
            >
              Join ride events →
            </Link>
            <Link
              href="/campaigns"
              className="rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm font-semibold text-emerald-900 hover:bg-white dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-100 dark:hover:bg-emerald-900/35"
            >
              Support campaigns →
            </Link>
            <Link
              href="/purpose"
              className="rounded-2xl border border-emerald-200 bg-white/80 p-4 text-sm font-semibold text-emerald-900 hover:bg-white dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-100 dark:hover:bg-emerald-900/35"
            >
              Read our purpose →
            </Link>
          </div>
        </div>
      </section>

      <section className="reveal reveal-5 flex flex-col gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            Built by {COMMUNITY_NAME}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-950 dark:text-white">
            Know a trail or run local rides?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
            Help grow the trail network by adding routes, running events, sharing local knowledge,
            or supporting campaign work.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 dark:border dark:border-lime-300/45 dark:bg-lime-300/15 dark:text-lime-50 dark:hover:bg-lime-300/25"
          >
            Add a trail
          </Link>
          <Link
            href="/experts/join"
            className="inline-flex items-center rounded-full border border-green-700 px-5 py-2.5 text-sm font-semibold text-green-800 transition hover:bg-green-50 dark:border-lime-300/45 dark:bg-lime-300/10 dark:text-lime-50 dark:hover:bg-lime-300/20"
          >
            Join as expert
          </Link>
        </div>
      </section>
    </div>
  );
}
