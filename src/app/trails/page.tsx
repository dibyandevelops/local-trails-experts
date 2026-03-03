'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Trail, Difficulty } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchTrailsPaginated } from '@/services/trails/trails.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS } from '@/services/constants/sports';

const TRAILS_SCROLL_KEY = 'trails_scroll_y';

function TrailGallery({ trails }: { trails: Trail[] }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trails.map((trail) => (
        <TrailCard
          key={trail.id}
          {...{
            ...trail,
            onClick() {
              sessionStorage.setItem(TRAILS_SCROLL_KEY, String(window.scrollY || 0));
              router.push(`/trails/${trail.id}`);
            },
          }}
        />
      ))}
    </div>
  );
}

function TrailsPageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`trail-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-48 w-full bg-gray-200" />
          <div className="p-4">
            <div className="mb-3 h-6 w-2/3 rounded bg-gray-200" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200" />
              <div className="h-6 w-20 rounded-full bg-gray-200" />
              <div className="h-6 w-14 rounded-full bg-gray-200" />
            </div>
            <div className="h-9 w-full rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrailsLoadMoreSkeleton() {
  return (
    <div className="mt-4 grid animate-pulse grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`trail-loadmore-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-48 w-full bg-gray-200" />
          <div className="p-4">
            <div className="mb-3 h-6 w-2/3 rounded bg-gray-200" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200" />
              <div className="h-6 w-20 rounded-full bg-gray-200" />
            </div>
            <div className="h-9 w-full rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrailsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didInitFromUrl = useRef(false);
  const didRestoreScroll = useRef(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [sport, setSport] = useState(DEFAULT_TRAIL_SPORT);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 12;

  const { data: user = null } = useCurrentUser();

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.trails.infiniteList({
      search,
      difficulty,
      location,
      sport,
      pageSize,
    }),
    queryFn: ({ signal, pageParam }) =>
      fetchTrailsPaginated(
        {
          search,
          difficulty,
          location,
          sport,
          page: Number(pageParam),
          pageSize,
        },
        signal
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    placeholderData: (previousData) => previousData,
  });

  const trails = data?.pages.flatMap((pageData) => pageData.trails) || [];
  const pagination =
    data && data.pages.length > 0
      ? data.pages[data.pages.length - 1].pagination
      : undefined;
  const isInitialLoading = isLoading && trails.length === 0;
  const isRefreshingResults = isFetching && !isFetchingNextPage && trails.length > 0;

  useEffect(() => {
    if (didRestoreScroll.current) return;
    if (isInitialLoading) return;
    const raw = sessionStorage.getItem(TRAILS_SCROLL_KEY);
    if (!raw) {
      didRestoreScroll.current = true;
      return;
    }
    const y = Number(raw);
    if (Number.isFinite(y)) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'auto' });
      });
    }
    sessionStorage.removeItem(TRAILS_SCROLL_KEY);
    didRestoreScroll.current = true;
  }, [isInitialLoading, trails.length]);

  useEffect(() => {
    if (didInitFromUrl.current) return;
    const urlSearch = (searchParams.get('search') || '').trim();
    const urlDifficulty = (searchParams.get('difficulty') || '').trim() as Difficulty | '';
    const urlLocation = (searchParams.get('location') || '').trim();
    const urlSport = (searchParams.get('sport') || '').trim();

    if (urlSearch) {
      setSearchInput(urlSearch);
      setSearch(urlSearch);
    }
    if (urlDifficulty) {
      setDifficulty(urlDifficulty);
    }
    if (urlLocation) {
      setLocationInput(urlLocation);
      setLocation(urlLocation);
    }
    if (urlSport && TRAIL_SPORTS.some((option) => option.value === urlSport)) {
      setSport(urlSport as typeof sport);
    }
    didInitFromUrl.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!didInitFromUrl.current) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (difficulty) params.set('difficulty', difficulty);
    if (location) params.set('location', location);
    if (sport && sport !== DEFAULT_TRAIL_SPORT) params.set('sport', sport);
    const query = params.toString();
    const nextUrl = query ? `/trails?${query}` : '/trails';
    router.replace(nextUrl, { scroll: false });
  }, [search, difficulty, location, sport, router]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting) return;
        if (!hasNextPage || isFetchingNextPage || isLoading) return;
        fetchNextPage();
      },
      {
        root: null,
        rootMargin: '300px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, trails.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setLocation(locationInput);
  };

  const hasActiveFilters = Boolean(search || difficulty || location || sport !== DEFAULT_TRAIL_SPORT);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-green-800 sm:text-3xl md:text-4xl">
          Search Trails
        </h1>
        {(user?.role === 'admin' || user?.role === 'expert') && (
          <button
            type="button"
            onClick={() => router.push('/trails/create')}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 sm:w-auto"
          >
            Create Trail
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-6 rounded-lg bg-gray-50 p-4 sm:mb-8 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Trail name, description, or location..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="City or region..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Trail Category</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as typeof sport)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {TRAIL_SPORTS.map((sportOption) => (
                <option key={sportOption.value} value={sportOption.value}>
                  {sportOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                }}
                className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
              >
                Search: {search} ×
              </button>
            )}
            {difficulty && (
              <button
                type="button"
                onClick={() => setDifficulty('')}
                className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
              >
                Difficulty: {difficulty} ×
              </button>
            )}
            {location && (
              <button
                type="button"
                onClick={() => {
                  setLocation('');
                  setLocationInput('');
                }}
                className="rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-800"
              >
                Location: {location} ×
              </button>
            )}
            {sport !== DEFAULT_TRAIL_SPORT && (
              <button
                type="button"
                onClick={() => setSport(DEFAULT_TRAIL_SPORT)}
                className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
              >
                Sport: {TRAIL_SPORTS.find((s) => s.value === sport)?.label || sport} ×
              </button>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700 sm:w-auto"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setDifficulty('');
              setLocationInput('');
              setLocation('');
              setSport(DEFAULT_TRAIL_SPORT);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-700 transition-colors hover:bg-gray-100 sm:w-auto"
          >
            Reset All
          </button>
        </div>
      </form>

      {isRefreshingResults && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
          Updating trails...
        </div>
      )}

      {isInitialLoading ? (
        <TrailsPageSkeleton />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{(error as Error).message}</p>
        </div>
      ) : trails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No trails found. Try adjusting your search criteria.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setDifficulty('');
                setLocationInput('');
                setLocation('');
                setSport(DEFAULT_TRAIL_SPORT);
              }}
              className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <TrailGallery trails={trails} />

          {isFetchingNextPage && <TrailsLoadMoreSkeleton />}
          {pagination && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row">
              <p className="text-sm text-gray-600">
                Showing {trails.length} of {pagination.total} trails
              </p>
              {/* <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasNextPage || isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hasNextPage ? 'Load More' : 'No More Trails'}
                </button>
              </div> */}
            </div>
          )}
          <div ref={loadMoreRef} className="h-2 w-full" aria-hidden="true" />
        </>
      )}
    </div>
  );
}


export default function TrailsPage() {
  return <TrailsPageContent />;
}
