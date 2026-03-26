'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SportType, User } from '@/types';
import { SPORT_OPTIONS, getSportLabel } from '@/services/constants/sports';
import { useQuery } from '@tanstack/react-query';
import { fetchExperts } from '@/services/experts/experts.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';

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

const sportOptions = SPORT_OPTIONS;

export default function ExpertsBrowsePage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<SportType | ''>('');
  const { data: experts = [], isLoading: loading } = useQuery<ExpertWithEvents[]>(
    {
      queryKey: QUERY_KEYS.experts.list({
        city: selectedCity,
        sport: selectedSport,
      }),
      queryFn: ({ signal }) =>
        fetchExperts(
          {
            city: selectedCity || undefined,
            sport: selectedSport || undefined,
          },
          signal
        ) as Promise<ExpertWithEvents[]>,
    }
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Experts
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Nepal
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Find Local Sports Experts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Browse verified guides, coaches, and outdoor leaders across Nepal.
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-emerald-200/70 bg-white/80 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              type="text"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              placeholder="Any city (leave blank for all)"
            />
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
            <ExpertCard
              key={expert.id}
              expert={expert}
              onViewExpert={() => router.push(`/experts/${expert.id}`)}
              onViewEvents={() => router.push(`/events?expert=${expert.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExpertCard({
  expert,
  onViewExpert,
  onViewEvents,
}: {
  expert: ExpertWithEvents;
  onViewExpert: () => void;
  onViewEvents: () => void;
}) {
  const primarySports = Array.isArray(expert.sports)
    ? expert.sports
    : expert.sports
    ? [expert.sports]
    : [];

  const upcomingEvents = (expert.events || []).slice(0, 3);
  const initials =
    (expert.name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'EX';
  const averageRating =
    typeof expert.average_rating === 'number' ? expert.average_rating : 0;
  const reviewCount = expert.review_count || 0;
  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={`expert-card-star-${expert.id}-${index}`} className="text-[11px]">
          {index < Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-gray-700">
            {expert.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={expert.profile_photo_url}
                alt={expert.name || 'Expert'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                {initials}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {expert.name || 'Local Expert'}
            </h2>
            {expert.city && (
              <p className="text-xs text-gray-500">{expert.city}</p>
            )}
            {reviewCount > 0 && (
              <div className="mt-1 flex items-center gap-2 text-xs text-amber-700">
                <span className="font-semibold text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
                {renderStars(averageRating)}
                <span className="text-gray-500">({reviewCount})</span>
              </div>
            )}
          </div>
        </div>
        {expert.is_verified_expert ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-[11px] font-semibold">
            Verified Expert
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
            Pending Verification
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
                {getSportLabel(sport)}
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onViewExpert}
            className="rounded-lg border border-green-700 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50"
          >
            View Expert
          </button>
          {upcomingEvents.length > 0 && (
            <button
              type="button"
              onClick={onViewEvents}
              className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
            >
              View Events
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
