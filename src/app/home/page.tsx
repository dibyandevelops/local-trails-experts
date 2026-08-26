import type { Metadata } from 'next';
import Link from 'next/link';
import HomeTrailSearch from '@/components/home/home-trail-search';
import { getHomeFeaturedTrails, getHomeSpotlight } from '@/lib/data/public-home';
import { getPublicRideNotes, type PublicRideNote } from '@/lib/data/public-ride-notes';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { jsonLdStringify } from '@/lib/jsonld';
import { DEFAULT_LOCALE, localizePath, type Locale } from '@/i18n/config';
import { homeCopy } from '@/i18n/home';

export const metadata: Metadata = {
  title: 'Kathmandu MTB Trails, Local Guides & Ride Support',
  description:
    'Find Kathmandu and Nepal MTB trails, local guides, ride support, organizations, campaigns, and bike services in one place.',
  keywords: [
    'Kathmandu MTB trails',
    'best MTB trails in Nepal',
    'mountain bike trails Nepal',
    'Nepal MTB trail map',
    'ride with local guides Nepal',
    'bike routes Nepal',
    'trail discovery Nepal',
    'local cycling guides Nepal',
    'local trail guides Nepal',
    'cycle hubs Kathmandu',
    'LocoXperts',
  ],
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'Kathmandu MTB Trails, Local Guides & Ride Support',
    description:
      'Find Kathmandu and Nepal MTB trails, local guides, ride support, organizations, campaigns, and bike services in one place.',
    url: '/home',
    type: 'website',
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kathmandu MTB Trails, Local Guides & Ride Support',
    description:
      'Find Kathmandu and Nepal MTB trails, local guides, ride support, organizations, campaigns, and bike services in one place.',
    images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  },
};

function getRideNoteMeta(note: PublicRideNote) {
  return [note.trail_name, note.expert_name ? `By ${note.expert_name}` : '']
    .filter(Boolean)
    .join(' / ');
}

function getRideNoteDescription(note: PublicRideNote) {
  const source = (note.excerpt || note.content).replace(/\s+/g, ' ').trim();
  if (source.length <= 120) return source;
  return `${source.slice(0, 117).replace(/\s+\S*$/, '')}...`;
}

export async function HomePage({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = homeCopy[locale];
  const [spotlight, featuredTrails, rideNotes] = await Promise.all([
    getHomeSpotlight(),
    getHomeFeaturedTrails(4),
    getPublicRideNotes(4),
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
          </div>
        </div>
      </section>

      {rideNotes.length > 0 && (
        <section
          className="mx-auto max-w-5xl px-4 pt-10 md:px-8 md:pt-12"
          aria-labelledby="featured-ride-notes-heading"
        >
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-lime-300">
                Community Journal
              </p>
              <h2
                id="featured-ride-notes-heading"
                className="mt-1 text-2xl font-black tracking-[-0.03em] text-emerald-950 dark:text-white md:text-3xl"
              >
                Featured Ride Notes & Guides
              </h2>
            </div>
            <Link
              href="/ride-notes"
              className="inline-flex items-center gap-1 text-sm font-black text-emerald-800 underline decoration-2 underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
            >
              Browse all ride notes &rarr;
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rideNotes.map((note) => {
              return (
                <article
                  key={note.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-lime-300/40"
                >
                  <div>
                    {note.cover_image_url && (
                      <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-emerald-950/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={note.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="absolute left-2.5 top-2.5 rounded-full border border-white/20 bg-emerald-950/75 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                          {note.category === 'trail_guide'
                            ? 'Trail Guide'
                            : note.category === 'safety'
                              ? 'Safety'
                              : note.category === 'expert_note'
                                ? 'Expert Note'
                                : 'Ride Note'}
                        </span>
                      </div>
                    )}
                    <h3 className="line-clamp-2 text-base font-black tracking-tight text-emerald-950 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-lime-300">
                      <Link href={`/ride-notes/${note.slug}`} className="focus:outline-none">
                        <span className="absolute inset-0 z-0" aria-hidden="true" />
                        {note.title}
                      </Link>
                    </h3>
                    {note.trail_name && (
                      <span className="mt-1.5 inline-block text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        📍 {note.trail_name}
                      </span>
                    )}
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-600 dark:text-slate-400">
                      {getRideNoteDescription(note)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] font-bold text-gray-500 dark:border-slate-800 dark:text-slate-400">
                    <span>{note.expert_name ? `By ${note.expert_name}` : 'Local guide'}</span>
                    <span className="text-emerald-700 group-hover:underline dark:text-lime-300">Read &rarr;</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section
        className="mx-auto max-w-5xl px-4 pt-7 [contain-intrinsic-size:0_520px] [content-visibility:auto] md:px-8 md:pt-9"
        aria-labelledby="platform-transparency"
      >
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
          <aside className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-emerald-50/55 p-5 dark:border-slate-800 dark:bg-slate-950 md:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-lime-200">
                LocoXperts
              </p>
              <p className="mt-3 text-sm leading-6 text-emerald-950/75 dark:text-slate-300">
                {copy.supportPrefix}{' '}
                <Link
                  href="/support-locoxperts"
                  className="font-bold text-emerald-900 underline underline-offset-4 transition hover:text-emerald-700 dark:text-lime-200 dark:hover:text-lime-100"
                >
                  {copy.supportLink}
                </Link>
                {' '}{copy.supportSuffix}
              </p>
              <p className="mt-4 text-sm leading-6 text-emerald-950/75 dark:text-slate-300">
                {copy.expertOrganizationPrompt}{' '}
                <Link
                  href={localizePath('/experts/join', locale)}
                  className="font-bold text-emerald-900 underline underline-offset-4 transition hover:text-emerald-700 dark:text-lime-200 dark:hover:text-lime-100"
                >
                  {copy.expertOrganizationLink}
                </Link>
                .
              </p>
            </div>
            <Link
              href={localizePath('/purpose', locale)}
              className="mt-5 inline-flex w-fit items-center text-xs font-black uppercase tracking-[0.14em] text-emerald-900 underline decoration-2 underline-offset-4 transition hover:text-emerald-700 dark:text-lime-200 dark:hover:text-lime-100"
            >
              {copy.exploreLabel}
            </Link>
          </aside>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-lime-200">
                  {copy.transparency.eyebrow}
                </p>
                <h2 id="platform-transparency" className="mt-3 text-2xl font-black leading-tight text-gray-950 dark:text-white">
                  {copy.transparency.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
                  {copy.transparency.description}
                </p>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
                  {copy.transparency.privacyPrefix}{' '}
                  <Link
                    href={localizePath('/privacy', locale)}
                    className="font-bold text-emerald-800 underline underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
                  >
                    {copy.transparency.privacyLink}
                  </Link>{' '}
                  {copy.transparency.privacySuffix}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {copy.transparency.items.map((item) => (
                  <article
                    key={item.title}
                    className="min-h-[128px] rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <h3 className="text-sm font-black text-gray-950 dark:text-slate-50">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-slate-300">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

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
