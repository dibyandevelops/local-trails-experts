'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Trail, Difficulty, RouteData, User, SportType } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchTrailsPaginated, requestTrail } from '@/services/trails/trails.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS, getSportLabel } from '@/services/constants/sports';
import { getSafetyLabelText } from '@/lib/trail-safety';
import { fetchVerifiedExperts } from '@/services/events/events.service';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import Map, {
  FullscreenControl,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import EventForm from '@/components/feature-components/event-form/event-form';

const TRAILS_SCROLL_KEY = 'trails_scroll_y';
const TRAILS_VIEW_KEY = 'trails_view_mode';

type TrailsViewMode = 'grid' | 'list';

function TrailGallery({
  trails,
  viewMode,
  onViewMap,
  onRequestTrail,
  onCreateEvent,
  canCreateEvent,
}: {
  trails: Trail[];
  viewMode: TrailsViewMode;
  onViewMap: (trail: Trail) => void;
  onRequestTrail: (trail: Trail) => void;
  onCreateEvent: (trail: Trail) => void;
  canCreateEvent: boolean;
}) {
  const router = useRouter();
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {trails.map((trail) => {
          const image =
            trail.image_url ||
            (Array.isArray(trail.trail_images) ? trail.trail_images[0] : null) ||
            '/tmp_pictures/Kapan-Monastery.jpg';
          return (
            <div
              key={trail.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                sessionStorage.setItem(TRAILS_SCROLL_KEY, String(window.scrollY || 0));
                router.push(`/trails/${trail.id}`);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  sessionStorage.setItem(TRAILS_SCROLL_KEY, String(window.scrollY || 0));
                  router.push(`/trails/${trail.id}`);
                }
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:bg-gray-50"
            >
              <img src={image} alt={trail.name} className="h-20 w-24 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-gray-900">{trail.name}</p>
                <p className="truncate text-sm text-gray-600">{trail.location}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {trail.distance_km ? `${trail.distance_km} km` : '—'} •{' '}
                  {trail.elevation_gain_m ? `${trail.elevation_gain_m}m` : '—'} •{' '}
                  {trail.estimated_time_hours ? `${trail.estimated_time_hours}h` : '—'} • {trail.difficulty}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {trail.sport_type && (
                    <span
                      className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800"
                      title="Trail sport category"
                    >
                      {getSportLabel(trail.sport_type)}
                    </span>
                  )}
                  {(trail.safety_labels || []).slice(0, 2).map((label) => (
                    <span
                      key={`${trail.id}-list-safe-${label}`}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                      title="Safety recommendation"
                    >
                      {getSafetyLabelText(label)}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onViewMap(trail);
                }}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                title="Open this trail in map modal"
              >
                Map
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRequestTrail(trail);
                }}
                className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-100"
                title="Request this trail activity with preferred expert/date"
              >
                Request
              </button>
              {canCreateEvent && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCreateEvent(trail);
                  }}
                  className="rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                  title="Create an event using this trail"
                >
                  Create
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {trails.map((trail) => (
        <TrailCard
          key={trail.id}
          {...{
            ...trail,
            onClick() {
              sessionStorage.setItem(TRAILS_SCROLL_KEY, String(window.scrollY || 0));
              router.push(`/trails/${trail.id}`);
            },
            onViewMap() {
              onViewMap(trail);
            },
            onRequestTrail() {
              onRequestTrail(trail);
            },
            onCreateEvent() {
              onCreateEvent(trail);
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
  const [viewMode, setViewMode] = useState<TrailsViewMode>('grid');
  const [mapTrail, setMapTrail] = useState<Trail | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [createEventTrailId, setCreateEventTrailId] = useState('');
  const [createEventSport, setCreateEventSport] = useState('');
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [requestTrailItem, setRequestTrailItem] = useState<Trail | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestDescription, setRequestDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [requestFeedback, setRequestFeedback] = useState('');
  const [requestModalMessage, setRequestModalMessage] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState('Request sent');
  const [toastDescription, setToastDescription] = useState(
    'Your trail request has been submitted.'
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 12;

  const { data: user = null } = useCurrentUser();
  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
  });

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

  const requestMutation = useMutation({
    mutationFn: (payload: {
      trailId: string;
      description: string;
      expert_user_id: string;
      preferred_date: string;
    }) =>
      requestTrail(payload.trailId, {
        description: payload.description,
        expert_user_id: payload.expert_user_id,
        preferred_date: payload.preferred_date,
      }),
    onSuccess: () => {
      setRequestFeedback('Request submitted successfully.');
      setRequestModalMessage('Request submitted successfully.');
      setToastTitle('Request sent');
      setToastDescription('Your trail request was submitted successfully.');
      setToastOpen(true);
      setRequestOpen(false);
      setRequestTrailItem(null);
      setRequestDescription('');
      setPreferredDate('');
      setSelectedExpertId('');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to submit request.';
      setRequestFeedback(message);
      setRequestModalMessage(message);
      setToastTitle('Request failed');
      setToastDescription(message);
      setToastOpen(true);
    },
  });

  const trails = data?.pages.flatMap((pageData) => pageData.trails) || [];
  const selectedCreateEventTrail =
    trails.find((trail) => trail.id === createEventTrailId) ?? null;
  const pagination =
    data && data.pages.length > 0
      ? data.pages[data.pages.length - 1].pagination
      : undefined;
  const isInitialLoading = isLoading && trails.length === 0;
  const isRefreshingResults = isFetching && !isFetchingNextPage && trails.length > 0;

  const mapStyle =
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
    (process.env.NEXT_PUBLIC_MAPTILER_KEY
      ? `https://api.maptiler.com/maps/satellite/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
      : ({
          version: 8,
          sources: {
            esri: {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: 'Esri, Maxar, Earthstar Geographics',
            },
          },
          layers: [{ id: 'esri-satellite', type: 'raster', source: 'esri' }],
        } as any));

  const getMapBounds = (routeData: RouteData) => {
    if (!routeData?.coordinates?.length) return null;
    const lats = routeData.coordinates.map((c) => c.latitude);
    const lons = routeData.coordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      minLat,
      maxLat,
      minLon,
      maxLon,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2,
    };
  };

  const getInitialZoom = (bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) => {
    const latSpan = Math.abs(bounds.maxLat - bounds.minLat);
    const lonSpan = Math.abs(bounds.maxLon - bounds.minLon);
    const maxSpan = Math.max(latSpan, lonSpan);
    if (maxSpan < 0.004) return 16;
    if (maxSpan < 0.008) return 15;
    if (maxSpan < 0.02) return 14;
    if (maxSpan < 0.05) return 13;
    if (maxSpan < 0.1) return 12;
    if (maxSpan < 0.25) return 11;
    if (maxSpan < 0.6) return 10;
    return 9;
  };

  const getRouteGeoJSON = (routeData: RouteData) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routeData.coordinates.map((c) => [c.longitude, c.latitude]),
    },
  });

  const getArrowGeoJSON = (routeData: RouteData) => {
    if (!routeData?.coordinates?.length) return null;
    const step = Math.max(12, Math.floor(routeData.coordinates.length / 40));
    const features = [];
    for (let i = step; i < routeData.coordinates.length; i += step) {
      const prev = routeData.coordinates[i - 1];
      const curr = routeData.coordinates[i];
      const dx = curr.longitude - prev.longitude;
      const dy = curr.latitude - prev.latitude;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [curr.longitude, curr.latitude] },
        properties: { angle },
      });
    }
    return { type: 'FeatureCollection', features };
  };

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
    const urlCreateTrail = (searchParams.get('createEventTrail') || '').trim();
    const urlCreateSport = (searchParams.get('createEventSport') || '').trim();

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
    if (urlCreateTrail) {
      setCreateEventTrailId(urlCreateTrail);
      setCreateEventSport(urlCreateSport || 'mtb');
      setCreateEventOpen(true);
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
    if (createEventOpen && createEventTrailId) {
      params.set('createEventTrail', createEventTrailId);
      params.set('createEventSport', createEventSport || 'mtb');
    }
    const query = params.toString();
    const nextUrl = query ? `/trails?${query}` : '/trails';
    router.replace(nextUrl, { scroll: false });
  }, [
    search,
    difficulty,
    location,
    sport,
    createEventOpen,
    createEventTrailId,
    createEventSport,
    router,
  ]);

  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? (localStorage.getItem(TRAILS_VIEW_KEY) as TrailsViewMode | null)
        : null;
    if (stored === 'grid' || stored === 'list') {
      setViewMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TRAILS_VIEW_KEY, viewMode);
  }, [viewMode]);

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
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'grid'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'list'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              List
            </button>
          </div>
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
          <TrailGallery
            trails={trails}
            viewMode={viewMode}
            canCreateEvent={user?.role === 'admin' || user?.role === 'expert'}
            onViewMap={(trail) => {
              setMapTrail(trail);
              setMapOpen(true);
            }}
            onRequestTrail={(trail) => {
              if (!user) {
                router.push('/register');
                return;
              }
              setRequestTrailItem(trail);
              setRequestOpen(true);
              setRequestFeedback('');
              setRequestModalMessage('');
            }}
            onCreateEvent={(trail) => {
              setCreateEventTrailId(trail.id);
              setCreateEventSport(trail.sport_type || 'mtb');
              setCreateEventOpen(true);
            }}
          />

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
          {requestFeedback && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              {requestFeedback}
            </div>
          )}
        </>
      )}

      <Dialog.Root
        open={mapOpen}
        onOpenChange={(open) => {
          setMapOpen(open);
          if (!open) setMapTrail(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[82vh] w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <Dialog.Title className="truncate pr-2 text-sm font-semibold text-white">
                {mapTrail?.name || 'Trail Map'}
              </Dialog.Title>
              <Dialog.Close className="rounded border border-white/20 px-3 py-1 text-xs text-white hover:bg-white/10">
                Close
              </Dialog.Close>
            </div>
            {mapTrail?.route_data?.coordinates?.length ? (
              <Map
                initialViewState={(() => {
                  const routeData = mapTrail.route_data as RouteData;
                  const bounds = getMapBounds(routeData);
                  if (bounds) {
                    return {
                      longitude: bounds.centerLon,
                      latitude: bounds.centerLat,
                      zoom: getInitialZoom(bounds),
                    };
                  }
                  return {
                    longitude: mapTrail.longitude || 0,
                    latitude: mapTrail.latitude || 0,
                    zoom: 12,
                  };
                })()}
                style={{ width: '100%', height: 'calc(82vh - 52px)' }}
                mapStyle={mapStyle}
              >
                <NavigationControl position="top-right" showCompass showZoom />
                <FullscreenControl position="top-right" />
                <ScaleControl position="bottom-left" unit="metric" />
                <Source
                  id="modal-route"
                  type="geojson"
                  data={getRouteGeoJSON(mapTrail.route_data as RouteData) as any}
                >
                  <Layer
                    id="modal-route-glow"
                    type="line"
                    paint={{
                      'line-color': '#0ea5e9',
                      'line-width': 9,
                      'line-opacity': 0.28,
                      'line-blur': 0.8,
                    }}
                  />
                  <Layer
                    id="modal-route-core"
                    type="line"
                    paint={{
                      'line-color': '#22d3ee',
                      'line-width': 4,
                      'line-opacity': 0.95,
                    }}
                  />
                </Source>
                {getArrowGeoJSON(mapTrail.route_data as RouteData) && (
                  <Source
                    id="modal-route-arrows"
                    type="geojson"
                    data={getArrowGeoJSON(mapTrail.route_data as RouteData) as any}
                  >
                    <Layer
                      id="modal-route-arrows-layer"
                      type="symbol"
                      layout={{
                        'text-field': '➤',
                        'text-size': 17,
                        'text-rotation-alignment': 'map',
                        'text-rotate': ['get', 'angle'],
                        'text-allow-overlap': true,
                        'text-ignore-placement': true,
                      }}
                      paint={{
                        'text-color': '#f59e0b',
                        'text-halo-color': '#0f172a',
                        'text-halo-width': 1.2,
                      }}
                    />
                  </Source>
                )}
                <Marker
                  longitude={(mapTrail.route_data as RouteData).coordinates[0].longitude}
                  latitude={(mapTrail.route_data as RouteData).coordinates[0].latitude}
                  anchor="bottom"
                >
                  <div className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                    Start
                  </div>
                </Marker>
                <Marker
                  longitude={
                    (mapTrail.route_data as RouteData).coordinates[
                      (mapTrail.route_data as RouteData).coordinates.length - 1
                    ].longitude
                  }
                  latitude={
                    (mapTrail.route_data as RouteData).coordinates[
                      (mapTrail.route_data as RouteData).coordinates.length - 1
                    ].latitude
                  }
                  anchor="bottom"
                >
                  <div className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                    End
                  </div>
                </Marker>
              </Map>
            ) : (
              <div className="grid h-[calc(82vh-52px)] place-items-center px-4 text-center text-sm text-gray-300">
                No GPX route data available for this trail.
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={createEventOpen}
        onOpenChange={(open) => {
          setCreateEventOpen(open);
          if (!open) {
            setCreateEventTrailId('');
            setCreateEventSport('');
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <Dialog.Title className="truncate pr-2 text-sm font-semibold text-gray-900">
                Create Event For Selected Trail
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">
                Close
              </Dialog.Close>
            </div>
            {createEventTrailId ? (
              <div className="h-[calc(88vh-52px)] overflow-y-auto p-4">
                <EventForm
                  mode="create"
                  lockTrailAndSport
                  embedded
                  initialUser={user}
                  prefillTrailId={createEventTrailId}
                  prefillTrail={selectedCreateEventTrail}
                  prefillSport={(createEventSport || 'mtb') as SportType}
                  onCompleted={() => {
                    setToastTitle('Event created');
                    setToastDescription('Your event was created successfully.');
                    setToastOpen(true);
                    setCreateEventOpen(false);
                    setCreateEventTrailId('');
                    setCreateEventSport('');
                  }}
                  onCancel={() => {
                    setCreateEventOpen(false);
                  }}
                />
              </div>
            ) : (
              <div className="grid h-[calc(88vh-52px)] place-items-center text-sm text-gray-600">
                Select a trail to create event.
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            setRequestTrailItem(null);
            setRequestModalMessage('');
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Request Trail Activity
            </Dialog.Title>
            <p className="mt-1 text-sm text-gray-600">
              {requestTrailItem
                ? `Trail: ${requestTrailItem.name}`
                : 'Pick expert and date for your request.'}
            </p>
            <div className="mt-4 space-y-3">
              {requestModalMessage && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  {requestModalMessage}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Select Expert
                </label>
                <select
                  value={selectedExpertId}
                  onChange={(e) => setSelectedExpertId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Choose expert</option>
                  {experts.map((expert) => (
                    <option key={expert.id} value={expert.id}>
                      {expert.name || expert.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="What kind of activity are you looking for?"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={() => {
                  if (!requestTrailItem) return;
                  if (!selectedExpertId) {
                    setRequestModalMessage('Please select an expert.');
                    return;
                  }
                  if (!preferredDate) {
                    setRequestModalMessage('Please select a preferred date.');
                    return;
                  }
                  setRequestModalMessage('');
                  requestMutation.mutate({
                    trailId: requestTrailItem.id,
                    description: requestDescription.trim(),
                    expert_user_id: selectedExpertId,
                    preferred_date: preferredDate,
                  });
                }}
                disabled={requestMutation.isPending}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast.Provider swipeDirection="right">
        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          className="fixed bottom-4 right-4 z-50 w-[90vw] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <Toast.Title className="text-sm font-semibold text-gray-900">
            {toastTitle}
          </Toast.Title>
          <Toast.Description className="mt-1 text-xs text-gray-600">
            {toastDescription}
          </Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-4 right-4 z-50" />
      </Toast.Provider>
    </div>
  );
}


export default function TrailsPage() {
  return <TrailsPageContent />;
}
