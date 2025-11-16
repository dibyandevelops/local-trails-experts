import Link from 'next/link';

export default function Home() {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold mb-6 text-green-800">
        Welcome to MTB Trail Finder
      </h1>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
        Discover amazing mountain biking trails and join events that match your
        expertise level. Connect with fellow riders and explore new adventures!
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/trails"
          className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
        >
          Search Trails
        </Link>
        <Link
          href="/events"
          className="bg-green-800 text-white px-8 py-3 rounded-lg hover:bg-green-900 transition-colors text-lg font-semibold"
        >
          View Events
        </Link>
      </div>
    </div>
  );
}

