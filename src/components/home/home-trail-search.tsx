'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useTrailAutocompleteOptions } from '@/hooks/use-trail-autocomplete-options';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import { getSportLabel } from '@/services/constants/sports';
import type { Trail } from '@/types';

type HomeTrailSearchProps = {
  featuredTrails: Trail[];
  copy?: {
    label: string;
    placeholder: string;
    button: string;
    matchingTitle: string;
    ideasTitle: string;
    viewAll: string;
    seeMore: string;
    empty: string;
  };
};

function getTrailHref(trail: Trail) {
  return `/trails/${encodeURIComponent(trail.slug || trail.id)}`;
}

function getTrailMeta(trail: Trail) {
  return [
    trail.location,
    trail.difficulty ? getDifficultyLabel(trail.difficulty) : '',
    trail.sport_type ? getSportLabel(trail.sport_type) || trail.sport_type : '',
    trail.distance_km ? `${Number(trail.distance_km).toFixed(1)} km` : '',
  ]
    .filter(Boolean)
    .join(' / ');
}

const defaultCopy = {
  label: 'Search trails',
  placeholder: 'Search Pharping, Chitlang, enduro, Kathmandu...',
  button: 'Search',
  matchingTitle: 'Matching trails',
  ideasTitle: 'Trail ideas',
  viewAll: 'View all',
  seeMore: 'See more trails',
  empty: 'No trails found for this search yet. Try a broader keyword.',
};

export default function HomeTrailSearch({ featuredTrails, copy = defaultCopy }: HomeTrailSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const searchEnabled = trimmedQuery.length >= 2;
  const { data: matchingTrails = [], isFetching } = useTrailAutocompleteOptions({
    query,
    enabled: searchEnabled,
    pageSize: 5,
  });

  const trailsToShow = useMemo(
    () => (searchEnabled ? matchingTrails : featuredTrails),
    [featuredTrails, matchingTrails, searchEnabled]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = trimmedQuery;
    router.push(search ? `/trails?search=${encodeURIComponent(search)}` : '/trails');
  };

  return (
    <div className="mt-7 max-w-3xl">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl border-b-2 border-emerald-800 bg-transparent pb-2 dark:border-lime-300"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label htmlFor="home-trail-search" className="sr-only">
            {copy.label}
          </label>
          <input
            id="home-trail-search"
            name="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            className="min-h-[54px] w-full border-0 bg-transparent px-0 text-xl font-black text-emerald-950 outline-none placeholder:text-emerald-800 focus:ring-0 dark:text-slate-50 dark:placeholder:text-slate-400 md:text-2xl"
            autoComplete="off"
          />
          <button
            type="submit"
            className="justify-self-start pb-2 text-sm font-black text-emerald-800 underline decoration-2 underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100 md:justify-self-end"
          >
            {copy.button}
          </button>
        </div>
      </form>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-emerald-800/20 pb-2 dark:border-lime-300/20">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800 dark:text-lime-200">
            {searchEnabled ? copy.matchingTitle : copy.ideasTitle}
          </p>
          {searchEnabled ? (
            <Link
              href={`/trails?search=${encodeURIComponent(trimmedQuery)}`}
              className="text-xs font-black text-emerald-800 underline decoration-2 underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
            >
              {copy.viewAll}
            </Link>
          ) : (
            <Link
              href="/trails"
              className="text-xs font-black text-emerald-800 underline decoration-2 underline-offset-4 transition hover:text-emerald-600 dark:text-lime-200 dark:hover:text-lime-100"
            >
              {copy.seeMore}
            </Link>
          )}
        </div>

        {searchEnabled && isFetching ? (
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse border-b border-emerald-800/10 bg-emerald-100/50 dark:border-lime-300/10 dark:bg-lime-300/5"
              />
            ))}
          </div>
        ) : trailsToShow.length > 0 ? (
          <div className="grid gap-x-6 sm:grid-cols-2">
            {trailsToShow.map((trail) => (
              <Link
                key={trail.id}
                href={getTrailHref(trail)}
                className="group border-b border-emerald-800/10 py-3 transition hover:border-emerald-700/40 dark:border-lime-300/10 dark:hover:border-lime-200/50"
              >
                <span className="block truncate text-sm font-black text-emerald-950 group-hover:text-emerald-700 dark:text-slate-50 dark:group-hover:text-lime-200">
                  {trail.name}
                </span>
                <span className="mt-1 block truncate text-xs text-gray-600 dark:text-slate-400">
                  {getTrailMeta(trail)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="border-b border-emerald-950/10 py-3 text-sm text-gray-600 dark:border-lime-300/10 dark:text-slate-300">
            {copy.empty}
          </p>
        )}
      </div>
    </div>
  );
}
