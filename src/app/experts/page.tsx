'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SportType, User } from '@/types';

type ExpertWithEvents = User & {
  events: {
    id: string;
    title: string;
    city: string | null;
    sport_type: SportType | null;
    price_npr: number;
    event_date: string;
  }[];
};

const sportOptions: { value: SportType; label: string }[] = [
  { value: 'mtb', label: 'MTB Trail Rides' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'trail_running', label: 'Trail Running' },
  { value: 'training', label: 'Training & Coaching' },
  { value: 'local_tour', label: 'Local Tours' },
];

export default function ExpertsBrowsePage() {
  const [experts, setExperts] = useState<ExpertWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('Kathmandu');
  const [selectedSport, setSelectedSport] = useState<SportType | ''>('');

  useEffect(() => {
    fetchExperts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedSport]);

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) {
        params.append('city', selectedCity);
      }
      if (selectedSport) {
        params.append('sport', selectedSport);
      }

      const res = await fetch(`/api/experts?${params.toString()}`);
      const data = await res.json();
      setExperts(data.experts || []);
    } catch (err) {
      console.error('Error fetching experts', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2 text-green-800">
        Find Local Sports Experts
      </h1>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        Browse verified and upcoming guides, coaches, and outdoor leaders in
        Kathmandu and Pokhara. Filter by sport to find MTB guides, hiking
        leaders, trail running partners, and training coaches.
      </p>

      <div className="bg-gray-50 p-4 rounded-xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="Kathmandu">Kathmandu</option>
              <option value="Pokhara">Pokhara</option>
              <option value="">All Cities</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Sport / Activity
            </label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value as SportType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="">All Sports</option>
              {sportOptions.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-gray-500">
              Verified experts are highlighted and are more likely to have
              hosted events and reviews.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-600">
          Loading experts...
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          No experts found. Try a different city or sport.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpertCard({ expert }: { expert: ExpertWithEvents }) {
  const primarySports = Array.isArray(expert.sports)
    ? expert.sports
    : expert.sports
    ? [expert.sports]
    : [];

  const upcomingEvents = (expert.events || []).slice(0, 3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {expert.name || 'Local Expert'}
          </h2>
          {expert.city && (
            <p className="text-xs text-gray-500">{expert.city}</p>
          )}
        </div>
        {expert.is_verified_expert && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-[11px] font-semibold">
            Verified Expert
          </span>
        )}
      </div>

      {expert.bio && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">
          {expert.bio}
        </p>
      )}

      {primarySports.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Sports</p>
          <div className="flex flex-wrap gap-1.5">
            {primarySports.map((sport) => (
              <span
                key={sport}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        {upcomingEvents.length > 0 ? (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-600 mb-1">
              Upcoming events
            </p>
            <ul className="space-y-1.5">
              {upcomingEvents.map((evt) => (
                <li
                  key={evt.id}
                  className="text-xs text-gray-700 flex justify-between gap-2"
                >
                  <span className="font-medium line-clamp-1">{evt.title}</span>
                  {evt.price_npr > 0 && (
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      NPR {evt.price_npr}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-3">
            No upcoming events listed yet.
          </p>
        )}

        <div className="flex gap-2">
          <Link
            href={`/events?city=${encodeURIComponent(
              expert.city || ''
            )}&sport=`}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Browse all events
          </Link>
          <Link
            href={`/experts/${expert.id}`}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
          >
            View profile & events
          </Link>
        </div>
      </div>
    </div>
  );
}


