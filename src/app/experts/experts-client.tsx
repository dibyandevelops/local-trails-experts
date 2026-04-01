'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SportType, User } from '@/types';
import { SPORT_OPTIONS, getSportLabel } from '@/services/constants/sports';
import { useQuery } from '@tanstack/react-query';
import { fetchExperts } from '@/services/experts/experts.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

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
            {EXPERTS_BETA_ENABLED && (
              <span className="rounded-full border border-amber-300/80 bg-amber-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                Beta
              </span>
            )}
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
          {EXPERTS_BETA_ENABLED && (
            <p className="mt-2 max-w-2xl text-xs font-medium text-amber-700 dark:text-amber-300">
              Beta feature: workflows may change.
            </p>
          )}
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
        <ExpertsGridSkeleton />
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
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-emerald-900/60 dark:bg-slate-950/60">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-5 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-slate-950/20 dark:to-cyan-950/30">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border border-emerald-200 bg-gray-100 text-gray-700 dark:border-emerald-900/60">
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
              <h2 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
              {expert.name || 'Local Expert'}
              </h2>
            {expert.city && (
                <p className="text-xs text-gray-500 dark:text-slate-400">{expert.city}</p>
            )}
              <div className="mt-1 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-semibold text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
                {renderStars(averageRating)}
                <span className="text-gray-500 dark:text-slate-400">({reviewCount})</span>
              </div>
            </div>
          </div>
          {expert.is_verified_expert ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-800 dark:bg-green-900/60 dark:text-green-100">
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
              Pending
            </span>
          )}
        </div>

        {primarySports.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {primarySports.map((sport) => (
              <span
                key={sport}
                className="rounded-full border border-emerald-300/80 bg-emerald-100/80 px-2.5 py-1 text-[11px] font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100"
              >
                {getSportLabel(sport)}
              </span>
            ))}
          </div>
        )}
      </div>

      {expert.bio && (
        <p className="mb-3 line-clamp-3 px-5 pt-4 text-sm text-gray-700 dark:text-slate-200">
          {expert.bio}
        </p>
      )}

      <div className="mt-auto px-5 pb-5">
        {upcomingEvents.length > 0 ? (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-300">
              Upcoming events
            </p>
            <ul className="space-y-1.5">
              {upcomingEvents.map((evt) => (
                <li
                  key={evt.id}
                  className="flex justify-between gap-2 text-xs text-gray-700 dark:text-slate-200"
                >
                  <span className="line-clamp-1 font-medium">{evt.title}</span>
                  {evt.price_npr > 0 && (
                    <span className="whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-400">
                      NPR {evt.price_npr}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
            No upcoming events listed yet.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onViewExpert}
            className="rounded-lg border border-green-700 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
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

function ExpertsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`expert-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-gray-200 dark:bg-slate-800" />
              <div className="h-3 w-20 rounded bg-gray-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="mb-3 h-4 w-full rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mb-3 h-4 w-4/5 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="h-24 rounded-xl bg-gray-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
