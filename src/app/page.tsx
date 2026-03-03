import Link from 'next/link';
// import PhoneVerifyToast from '@/components/phone-verify-toast';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* <PhoneVerifyToast /> */}
      <section className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-green-700 uppercase mb-4">
          Kathmandu • Pokhara • Himalaya
        </p>
        <h1 className="mx-auto max-w-4xl text-balance text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 text-gray-900 dark:text-gray-100">
          Guided Trails & Training with Local Experts
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Discover MTB trails, hiking routes, trail runs, and performance
          training sessions across Nepal. Join curated group rides or book
          private coaching with verified local experts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/events?city=Kathmandu"
            className="bg-green-700 text-white px-8 py-3 rounded-full hover:bg-green-800 transition-colors text-sm md:text-base font-semibold shadow-sm"
          >
            Browse Events in Kathmandu
          </Link>
          <Link
            href="/register"
            className="border border-green-700 text-green-800 px-8 py-3 rounded-full hover:bg-green-50 transition-colors text-sm md:text-base font-semibold"
          >
            Join Events
          </Link>
          <Link
            href="/experts/join"
            className="border border-green-700 text-green-800 px-8 py-3 rounded-full hover:bg-green-50 transition-colors text-sm md:text-base font-semibold"
          >
            Become a Sports Expert
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            For Riders & Adventurers
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Join small-group rides, hikes, and runs led by locals who know the
            terrain, weather, and hidden viewpoints.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• MTB trail rides around Kathmandu & Pokhara</li>
            <li>• Sunrise hikes and cultural local visits</li>
            <li>• Trail running sessions on classic ridgelines</li>
          </ul>
        </div>

        <div className="bg-green-900 text-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            For Local Sports Experts
          </h2>
          <p className="text-sm text-green-100 mb-3">
            Turn your local knowledge into income. Host guided events or
            structured training blocks for visiting athletes.
          </p>
          <ul className="text-sm text-green-100 space-y-1">
            <li>• Create paid events with flexible pricing</li>
            <li>• Offer group, private, or corporate sessions</li>
            <li>• Unlock a <span className="font-semibold">Verified Expert</span> badge</li>
          </ul>
          <Link
            href="/experts/join"
            className="inline-flex mt-4 text-sm font-semibold text-green-100 underline-offset-4 hover:underline"
          >
            Start your expert application →
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            Focused on Kathmandu Valley
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Discover curated routes and events around Kapan, Nagarkot, Shivapuri,
            and more — with Pokhara and other hubs coming online soon.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Filter by city, sport, date, and difficulty</li>
            <li>• See trail details and elevation profiles</li>
            <li>• Book and pay locally using QR-based options</li>
          </ul>
        </div>
      </section>

      <section className="bg-gradient-to-r from-green-50 to-sky-50 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Training & Performance Sessions
          </h2>
          <p className="text-sm text-gray-600 mb-3 max-w-xl">
            Looking for structured cycling training, skills coaching, or
            trail-running intervals around Kathmandu or Pokhara? Browse
            training-focused events created by local coaches.
          </p>
          <Link
            href="/events?city=Kathmandu&sport=training"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            See training events for experts & athletes
          </Link>
        </div>
        <div className="text-xs text-gray-500 max-w-xs">
          Weather-aware scheduling, safety updates, and offline-friendly
          experiences are part of the roadmap as the platform grows.
        </div>
      </section>
    </div>
  );
}
