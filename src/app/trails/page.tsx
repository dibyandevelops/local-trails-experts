'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Trail, Difficulty } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { useRouter } from 'next/navigation';
import { fetchTrailsPaginated } from '@/services/trails/trails.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS } from '@/services/constants/sports';

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
              router.push(`/trails/${trail.id}`);
            },
          }}
        />
      ))}
    </div>
  );
}

function TrailsPageContent() {
  const router = useRouter();
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
            Reset
          </button>
        </div>
      </form>

      {isRefreshingResults && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
          Updating trails...
        </div>
      )}

      {isInitialLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading trails...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{(error as Error).message}</p>
        </div>
      ) : trails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No trails found. Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <>
          <TrailGallery trails={trails} />
          {pagination && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row">
              <p className="text-sm text-gray-600">
                Showing {trails.length} of {pagination.total} trails
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasNextPage || isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? 'Loading...'
                    : hasNextPage
                      ? 'Load More'
                      : 'No More Trails'}
                </button>
              </div>
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
