'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

type HomeTrailSearchCopy = NonNullable<HomeTrailSearchProps['copy']>;

const AUTOCOMPLETE_MIN_LENGTH = 2;
const AUTOCOMPLETE_PAGE_SIZE = 5;
const AUTOCOMPLETE_DEBOUNCE_MS = 300;
const SKELETON_ROWS = 4;

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

async function fetchMatchingTrails(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({
    search: query,
    page: '1',
    pageSize: String(AUTOCOMPLETE_PAGE_SIZE),
    excludeEventRoutes: 'true',
  });
  const response = await fetch(`/api/trails?${params.toString()}`, { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as { trails?: Trail[] };
  return Array.isArray(data.trails) ? data.trails : [];
}

function useHomeTrailAutocomplete(query: string) {
  const trimmedQuery = query.trim();
  const enabled = trimmedQuery.length >= AUTOCOMPLETE_MIN_LENGTH;
  const [matchingTrails, setMatchingTrails] = useState<Trail[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setMatchingTrails([]);
      setIsFetching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsFetching(true);
      try {
        const trails = await fetchMatchingTrails(trimmedQuery, controller.signal);
        setMatchingTrails(trails);
      } catch (error) {
        if ((error as DOMException)?.name !== 'AbortError') {
          setMatchingTrails([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsFetching(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled, trimmedQuery]);

  return { enabled, isFetching, matchingTrails, trimmedQuery };
}

function TrailResultsSkeleton() {
  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
        <div
          key={index}
          className="h-11 animate-pulse border-b border-emerald-800/10 bg-emerald-100/50 dark:border-lime-300/10 dark:bg-lime-300/5"
        />
      ))}
    </div>
  );
}

function TrailResultsList({ trails }: { trails: Trail[] }) {
  return (
    <div className="grid gap-x-6 sm:grid-cols-2">
      {trails.map((trail) => (
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
  );
}

function EmptyTrailResults({ copy }: { copy: HomeTrailSearchCopy }) {
  return (
    <p className="border-b border-emerald-950/10 py-3 text-sm text-gray-600 dark:border-lime-300/10 dark:text-slate-300">
      {copy.empty}
    </p>
  );
}

export default function HomeTrailSearch({ featuredTrails, copy = defaultCopy }: HomeTrailSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const {
    enabled: searchEnabled,
    isFetching,
    matchingTrails,
    trimmedQuery,
  } = useHomeTrailAutocomplete(query);

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
          <TrailResultsSkeleton />
        ) : trailsToShow.length > 0 ? (
          <TrailResultsList trails={trailsToShow} />
        ) : (
          <EmptyTrailResults copy={copy} />
        )}
      </div>
    </div>
  );
}
