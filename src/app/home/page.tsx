import type { Metadata } from 'next';
import Link from 'next/link';
import HomeTrailSearch from '@/components/home/home-trail-search';
import { getHomeFeaturedTrails, getHomeSpotlight } from '@/lib/data/public-home';
import { getPublicRideNotes, type PublicRideNote } from '@/lib/data/public-ride-notes';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { homeCopy } from '@/i18n/home';

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

function getRideNoteMeta(note: PublicRideNote) {
  return [note.trail_name, note.expert_name ? `By ${note.expert_name}` : '']
    .filter(Boolean)
    .join(' / ');
}

export async function HomePage({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = homeCopy[locale];
  const [spotlight, featuredTrails, rideNotes] = await Promise.all([
    getHomeSpotlight(),
    getHomeFeaturedTrails(5),
    getPublicRideNotes(3),
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

      <section className="reveal reveal-1 relative overflow-hidden border-y border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-lime-50/60 px-4 py-9 dark:border-emerald-900/60 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/40 md:px-8 md:py-12 lg:px-10 lg:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(90deg,rgba(6,78,59,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(6,78,59,0.045)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px] dark:opacity-25" />
        <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl dark:bg-lime-300/10" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-emerald-700/10 blur-3xl dark:bg-emerald-400/10" />

        <div className="relative mx-auto max-w-5xl">
          <div className="max-w-4xl">
            <h1 className="text-balance text-5xl font-black leading-[0.9] tracking-[-0.055em] text-emerald-950 dark:text-white md:text-7xl lg:text-8xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-950/75 dark:text-slate-300 md:text-lg">
              {copy.heroDescription}
            </p>
            <HomeTrailSearch featuredTrails={featuredTrails} copy={copy.search} />

            {spotlight && (
              <Link
                href={spotlight.href}
                className="mt-8 inline-block max-w-2xl rounded-r-2xl border-l-4 border-emerald-700 bg-white/75 py-3 pl-4 pr-5 text-sm text-emerald-950 shadow-sm backdrop-blur-sm transition hover:border-emerald-600 hover:bg-white hover:text-emerald-700 dark:border-lime-300 dark:bg-slate-900/45 dark:text-slate-200 dark:hover:bg-slate-900/70 dark:hover:text-lime-100"
              >
                <span className="text-xs font-black uppercase tracking-[0.18em]">
                  {spotlight.type === 'event'
                    ? copy.spotlightLabels.event
                    : spotlight.type === 'ride'
                      ? copy.spotlightLabels.ride
                      : copy.spotlightLabels.idea}
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

            {rideNotes.length > 0 && (
              <div className="mt-8 max-w-3xl border-t border-emerald-950/15 pt-4 dark:border-lime-300/20">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-950 dark:text-lime-200">
                    {copy.rideNotesTitle}
                  </p>
                  <Link
                    href="/ride-notes"
                    className="text-xs font-black text-emerald-950 underline decoration-2 underline-offset-4 transition hover:text-emerald-700 dark:text-lime-200 dark:hover:text-lime-100"
                  >
                    {copy.readMore}
                  </Link>
                </div>
                <div className="grid gap-x-6 sm:grid-cols-3">
                  {rideNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/ride-notes/${note.slug}`}
                      className="group border-b border-emerald-950/10 py-3 transition hover:border-emerald-700/40 dark:border-lime-300/10 dark:hover:border-lime-200/50"
                    >
                      <span className="block line-clamp-2 text-sm font-black text-gray-950 group-hover:text-emerald-800 dark:text-slate-50 dark:group-hover:text-lime-200">
                        {note.title}
                      </span>
                      {getRideNoteMeta(note) && (
                        <span className="mt-1 block truncate text-xs text-gray-600 dark:text-slate-400">
                          {getRideNoteMeta(note)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8 md:pt-8">
        <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-400">
          {copy.supportPrefix}{' '}
          <Link
            href="/support-locoxperts"
            className="font-bold text-emerald-800 underline underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
          >
            {copy.supportLink}
          </Link>
          {' '}{copy.supportSuffix}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-400">
          {copy.expertOrganizationPrompt}{' '}
          <Link href="/experts/join" className="font-bold text-emerald-800 underline underline-offset-4 dark:text-lime-200">
            {copy.expertOrganizationLink}
          </Link>
          .
        </p>
      </div>

      <nav
        aria-label={copy.exploreLabel}
        className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-3 px-4 py-6 text-sm font-semibold text-gray-600 dark:text-slate-400 md:px-8 md:py-8"
      >
        {copy.featureActions.map((item) => (
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

export default async function Home() {
  return <HomePage locale="en" />;
}
