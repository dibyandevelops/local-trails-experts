import type { Metadata } from 'next';
import Link from 'next/link';
import HomeTrailSearch from '@/components/home/home-trail-search';
import { getHomeFeaturedTrails, getHomeSpotlight } from '@/lib/data/public-home';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'Kathmandu MTB Trails, Local Experts & Ride Support',
  description:
    'Find Kathmandu and Nepal MTB trails, route guides, local experts, ride support, organizations, campaigns, and bike services in one place.',
  keywords: [
    'Kathmandu MTB trails',
    'best MTB trails in Nepal',
    'mountain bike trails Nepal',
    'Nepal MTB trail map',
    'ride with experts Nepal',
    'bike routes Nepal',
    'trail discovery Nepal',
    'local cycling guides Nepal',
    'local trail guides Nepal',
    'cycle hubs Kathmandu',
    'LocoXperts',
  ],
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'Kathmandu MTB Trails, Local Experts & Ride Support',
    description:
      'Find Kathmandu and Nepal MTB trails, route guides, local experts, ride support, organizations, campaigns, and bike services in one place.',
    url: '/home',
    type: 'website',
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kathmandu MTB Trails, Local Experts & Ride Support',
    description:
      'Find Kathmandu and Nepal MTB trails, route guides, local experts, ride support, organizations, campaigns, and bike services in one place.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  },
};

const featureActions = [
  { label: 'Find trails', href: '/trails' },
  { label: 'Ride with experts', href: '/ride-with-experts' },
  { label: 'Bike shops and support', href: '/store-locator' },
  { label: 'Local organizations', href: '/organizations' },
  { label: 'Trail campaigns', href: '/campaigns' },
  { label: 'Share a trail', href: '/upload' },
  { label: 'Join as an expert', href: '/experts/join' },
];

export default async function Home() {
  const [spotlight, featuredTrails] = await Promise.all([
    getHomeSpotlight(),
    getHomeFeaturedTrails(5),
  ]);
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
    <div className="pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
      />

      <section className="reveal reveal-1 relative overflow-hidden border-y border-emerald-200/70 bg-[#f5f0df] px-4 py-9 dark:border-emerald-900/60 dark:bg-slate-950 md:px-8 md:py-12 lg:px-10 lg:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,78,59,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(6,78,59,0.07)_1px,transparent_1px)] bg-[size:64px_64px] dark:opacity-20" />
        <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-lime-300/25 blur-3xl dark:bg-lime-300/10" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-emerald-700/10 blur-3xl dark:bg-emerald-400/10" />

        <div className="relative mx-auto max-w-5xl">
          <div className="max-w-4xl">
            <h1 className="text-balance text-5xl font-black leading-[0.9] tracking-[-0.055em] text-gray-950 dark:text-white md:text-7xl lg:text-8xl">
              Find trails worth riding.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-700 dark:text-slate-300 md:text-lg">
              Search local routes, meet the experts who know them, and find support before the ride.
            </p>

            <HomeTrailSearch featuredTrails={featuredTrails} />

            {spotlight && (
              <Link
                href={spotlight.href}
                className="mt-8 inline-block max-w-2xl border-l-2 border-emerald-800 bg-white/35 py-3 pl-4 pr-5 text-sm text-emerald-950 backdrop-blur-sm transition hover:border-emerald-600 hover:bg-white/50 hover:text-emerald-700 dark:border-lime-300 dark:bg-slate-900/45 dark:text-slate-200 dark:hover:bg-slate-900/70 dark:hover:text-lime-100"
              >
                <span className="text-xs font-black uppercase tracking-[0.18em]">
                  {spotlight.type === 'event'
                    ? 'Now'
                    : spotlight.type === 'ride'
                      ? 'Expert'
                      : 'Idea'}
                </span>
                <span className="mx-2 text-emerald-700 dark:text-emerald-300">/</span>
                <span>{spotlight.title}</span>
                {spotlight.meta && (
                  <span className="mt-1 block text-xs text-gray-600 dark:text-slate-400">
                    {spotlight.meta}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8 md:pt-8">
        <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-400">
          If LocoXperts helps you find better rides, consider{' '}
          <Link
            href="/support-locoxperts"
            className="font-bold text-emerald-800 underline underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
          >
            supporting the developer
          </Link>
          {' '}so the platform can stay alive, improve, and remain useful for local riders.
        </p>
      </div>

      <nav
        aria-label="Explore LocoXperts"
        className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-3 px-4 py-6 text-sm font-semibold text-gray-600 dark:text-slate-400 md:px-8 md:py-8"
      >
        {featureActions.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="underline-offset-4 transition hover:text-emerald-700 hover:underline dark:hover:text-lime-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>

    </div>
  );
}
