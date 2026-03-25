import Link from 'next/link';
import JoinAdventureButton from '@/components/home/join-adventure-button';
// import PhoneVerifyToast from '@/components/phone-verify-toast';

export default function Home() {
  return (
    <div className="space-y-14 md:space-y-16">
      {/* <PhoneVerifyToast /> */}
      <section className="reveal reveal-1 relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-10 text-center shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/30" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
          Global Trails • Local Experts • Outdoor Adventures
        </p>
        <h1 className="mx-auto mb-4 max-w-4xl text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl lg:text-6xl">
          Guided Trails & Training with Local Experts
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300 md:text-xl">
          Discover MTB trails, hiking routes, trail runs, and performance
          training sessions around the world. Join curated group rides or book
          private coaching with verified local experts.
        </p>

        <div className="mx-auto mb-6 grid max-w-2xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
          <div className="reveal reveal-2 rounded-xl border border-emerald-200 bg-white/90 p-3 dark:border-emerald-900 dark:bg-slate-900/90">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sports</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">8 Categories</p>
          </div>
          <div className="reveal reveal-3 rounded-xl border border-emerald-200 bg-white/90 p-3 dark:border-emerald-900 dark:bg-slate-900/90">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Cities</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Worldwide</p>
          </div>
          <div className="reveal reveal-4 rounded-xl border border-emerald-200 bg-white/90 p-3 dark:border-emerald-900 dark:bg-slate-900/90">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Experts</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Verified Hosts</p>
          </div>
          <div className="reveal reveal-5 rounded-xl border border-emerald-200 bg-white/90 p-3 dark:border-emerald-900 dark:bg-slate-900/90">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Events</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Daily Listings</p>
          </div>
        </div>

        <div className="reveal reveal-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/trails"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-emerald-100 px-7 py-3 text-sm font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-300 transition hover:bg-emerald-200 dark:bg-emerald-400 dark:text-emerald-950 dark:ring-emerald-300 dark:hover:bg-emerald-300 md:text-base"
          >
            Browse Trails
          </Link>
          <Link
            href="/events"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
          >
            Browse Events
          </Link>
          <JoinAdventureButton className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base" />
          {/* <Link
            href="/experts/join"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base"
          >
            Become a Sports Expert
          </Link> */}
        </div>
      </section>

      <section className="reveal reveal-2 grid gap-6 md:grid-cols-3">
        <div className="reveal reveal-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            For Riders & Adventurers
          </h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Join small-group rides, hikes, and runs led by locals who know the
            terrain, weather, and hidden viewpoints.
          </p>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>• MTB trail rides and guided routes worldwide</li>
            <li>• Sunrise hikes and cultural local visits</li>
            <li>• Trail running sessions on classic ridgelines</li>
          </ul>
        </div>

        <div className="reveal reveal-4 rounded-2xl bg-green-900 p-6 text-white shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">
            For Local Sports Experts
          </h2>
          <p className="mb-3 text-sm text-green-100">
            Turn your local knowledge into income. Host guided events or
            structured training blocks for visiting athletes.
          </p>
          <ul className="space-y-1 text-sm text-green-100">
            <li>• Create paid events with flexible pricing</li>
            <li>• Offer group, private, or corporate sessions</li>
            <li>
              • Unlock a <span className="font-semibold">Verified Expert</span> badge
            </li>
          </ul>
          <Link
            href="/experts/join"
            className="inline-flex mt-4 text-sm font-semibold text-green-100 underline-offset-4 hover:underline"
          >
            Start your expert application →
          </Link>
        </div>

        <div className="reveal reveal-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Built for Any Region
          </h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Discover curated routes and events across cities, mountain regions,
            and travel destinations around the world.
          </p>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>• Filter by city, sport, date, and difficulty</li>
            <li>• See trail details and elevation profiles</li>
            <li>• Book and pay locally using QR-based options</li>
          </ul>
        </div>
      </section>

      <section className="reveal reveal-6 flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-r from-green-50 to-sky-50 p-6 dark:from-green-950/40 dark:to-sky-950/30 md:flex-row md:p-10">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Training & Performance Sessions
          </h2>
          <p className="mb-3 max-w-xl text-sm text-gray-600 dark:text-gray-300">
            Looking for structured cycling training, skills coaching, or
            trail-running intervals? Browse training-focused events created by
            local coaches around the world.
          </p>
          <Link
            href="/events?sport=training"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            See training events for experts & athletes
          </Link>
        </div>
        <div className="max-w-xs text-xs text-gray-500 dark:text-gray-400">
          Weather-aware scheduling, safety updates, and offline-friendly
          experiences are part of the roadmap as the platform grows.
        </div>
      </section>
    </div>
  );
}
