'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trail, Difficulty, RouteData, User, SportType } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchTrailsPaginated,
  requestTrail,
  deleteTrail,
  hideTrail,
  unhideTrail,
  fetchTrailMapById,
} from '@/services/trails/trails.service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { TRAIL_SPORTS, getSportLabel } from '@/services/constants/sports';
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
import { getMapLibreCompatibleMapStyle, type MapStyleMode } from '@/lib/map-styles';
import TrailImagePlaceholder from '@/components/ui/trail-image-placeholder';
import TrailImageCarouselModal from '@/components/ui/trail-image-carousel-modal';
import { getKomootNavigateUrl } from '@/lib/komoot';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import TrailRequestModal from '@/components/feature-components/trail-request/trail-request-modal';
import {
  getDifficultyLabel,
  normalizeDifficulty,
  TRAIL_DIFFICULTY_OPTIONS,
} from '@/services/constants/difficulty';
import { isShuttleEligibleSport } from '@/lib/shuttle';
import { getTrailAttributionChipClass, getTrailAttributionLabel } from '@/lib/trail-attribution';

const TRAILS_SCROLL_KEY = 'trails_scroll_y';
const TRAILS_LAST_URL_KEY = 'trails_last_url';

type TrailsViewMode = 'grid' | 'quick';
type TrailsPageParam = { offset: number; limit: number };
type TrailSort =
  | 'random'
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'distance_asc'
  | 'distance_desc'
  | 'elevation_desc';
type RideProfile = '' | 'short' | 'medium' | 'long';

const TRAIL_SORT_OPTIONS: Array<{ value: TrailSort; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'newest', label: 'Newest' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: 'distance_asc', label: 'Distance (low → high)' },
  { value: 'distance_desc', label: 'Distance (high → low)' },
  { value: 'elevation_desc', label: 'Elevation gain (high → low)' },
];

const RIDE_PROFILE_QUICK_FILTERS: Array<{ label: string; value: RideProfile }> = [
  { label: 'All rides', value: '' },
  { label: 'Short ride', value: 'short' },
  { label: 'Medium ride', value: 'medium' },
  { label: 'Long ride', value: 'long' },
];

function isTrailSort(value: string): value is TrailSort {
  return TRAIL_SORT_OPTIONS.some((option) => option.value === value);
}

function TrailGallery({
  trails,
  viewMode,
  onViewMap,
  onRequestTrail,
  onCancelRequest,
  onCreateEvent,
  onOpenImageGallery,
  canRequestTrail,
  canCreateEvent,
  isAdmin,
  onEditTrail,
  onDeleteTrail,
  onHideTrail,
  onUnhideTrail,
  deletingTrailId,
  hidingTrailId,
  unhidingTrailId,
}: {
  trails: Array<Trail & { isRequested?: boolean }>;
  viewMode: TrailsViewMode;
  onViewMap: (trail: Trail) => void;
  onRequestTrail?: (trail: Trail & { isRequested?: boolean }) => void;
  onCancelRequest?: (trail: Trail & { isRequested?: boolean }) => void;
  onCreateEvent: (trail: Trail) => void;
  onOpenImageGallery?: (trail: Trail) => void;
  canRequestTrail: boolean;
  canCreateEvent: boolean;
  isAdmin: boolean;
  onEditTrail?: (trail: Trail) => void;
  onDeleteTrail?: (trailId: string) => void;
  onHideTrail?: (trailId: string) => void;
  onUnhideTrail?: (trailId: string) => void;
  deletingTrailId?: string | null;
  hidingTrailId?: string | null;
  unhidingTrailId?: string | null;
}) {
  const router = useRouter();
  const storeTrailsListState = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(
      TRAILS_LAST_URL_KEY,
      `${window.location.pathname}${window.location.search}`
    );
    sessionStorage.setItem(TRAILS_SCROLL_KEY, String(window.scrollY || 0));
  };
  if (viewMode === 'quick') {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {trails.map((trail) => {
          const distanceKm = Number(trail.distance_km);
          const elevationM = Number(trail.elevation_gain_m);
          return (
            <Link
              key={trail.id}
              href={`/trails/${trail.slug || trail.id}`}
              onClick={storeTrailsListState}
              className="group rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-slate-800 dark:bg-slate-900/70"
              aria-label={`View details for ${trail.name}`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 dark:text-white">
                  {trail.name}
                </p>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {getDifficultyLabel(trail.difficulty)}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-gray-600 dark:text-slate-300">
                {trail.location || 'Nepal'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                  {Number.isFinite(distanceKm) && distanceKm > 0
                    ? `${distanceKm.toFixed(1)} km`
                    : 'Distance —'}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                  {Number.isFinite(elevationM) && elevationM > 0
                    ? `${elevationM} m`
                    : 'Elevation —'}
                </span>
                {trail.built_by_org_name && (
                  <span
                    className={`inline-flex max-w-[160px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTrailAttributionChipClass('built_by')}`}
                    title={`Built: ${trail.built_by_org_name}`}
                  >
                    <span className="truncate">
                      {getTrailAttributionLabel('built_by')}: {trail.built_by_org_name}
                    </span>
                  </span>
                )}
                {trail.verified_by_org_name && (
                  <span
                    className={`inline-flex max-w-[160px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTrailAttributionChipClass('verified_by')}`}
                    title={`Verified: ${trail.verified_by_org_name}`}
                  >
                    <span className="truncate">
                      {getTrailAttributionLabel('verified_by')}: {trail.verified_by_org_name}
                    </span>
                  </span>
                )}
                {trail.maintained_by_org_name && (
                  <span
                    className={`inline-flex max-w-[160px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTrailAttributionChipClass('maintained_by')}`}
                    title={`Maintained: ${trail.maintained_by_org_name}`}
                  >
                    <span className="truncate">
                      {getTrailAttributionLabel('maintained_by')}: {trail.maintained_by_org_name}
                    </span>
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trails.map((trail) => (
        <TrailCard
          key={trail.id}
          {...{
            ...trail,
            isRequested: trail.isRequested,
            detailsHref: `/trails/${trail.slug || trail.id}`,
            onBeforeNavigate: storeTrailsListState,
            onViewMap() {
              onViewMap(trail);
            },
            ...(canRequestTrail && onRequestTrail
              ? {
                  onRequestTrail() {
                    onRequestTrail(trail);
                  },
                  onCancelRequest() {
                    onCancelRequest?.(trail);
                  },
                }
              : {}),
            ...(canCreateEvent
              ? {
                  onCreateEvent() {
                    onCreateEvent(trail);
                  },
                }
              : {}),
            ...(onOpenImageGallery
              ? {
                  onOpenImageGallery() {
                    onOpenImageGallery(trail);
                  },
                }
              : {}),
            ...(isAdmin
              ? {
                  deleteLoading: deletingTrailId === trail.id,
                  hideLoading: hidingTrailId === trail.id,
                  unhideLoading: unhidingTrailId === trail.id,
                  onEdit() {
                    onEditTrail?.(trail);
                  },
                  onDelete() {
                    onDeleteTrail?.(trail.id);
                  },
                  onHide() {
                    onHideTrail?.(trail.id);
                  },
                  onUnhide() {
                    onUnhideTrail?.(trail.id);
                  },
                }
              : {}),
          }}
        />
      ))}
    </div>
  );
}

function TrailsPageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`trail-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-48 w-full bg-gray-200 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-3 h-6 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-full rounded bg-gray-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrailsLoadMoreSkeleton() {
  return (
    <div
      className="mt-4 grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`trail-loadmore-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-48 w-full bg-gray-200 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-3 h-6 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-full rounded bg-gray-200 dark:bg-slate-800" />
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
  const [sport, setSport] = useState('');
  const [distanceMinInput, setDistanceMinInput] = useState('');
  const [distanceMaxInput, setDistanceMaxInput] = useState('');
  const [distanceMin, setDistanceMin] = useState('');
  const [distanceMax, setDistanceMax] = useState('');
  const [rideProfile, setRideProfile] = useState<RideProfile>('');
  const [sort, setSort] = useState<TrailSort>('random');
  const [draftDifficulty, setDraftDifficulty] = useState<Difficulty | ''>('');
  const [draftSport, setDraftSport] = useState('');
  const [draftRideProfile, setDraftRideProfile] = useState<RideProfile>('');
  const [draftSort, setDraftSort] = useState<TrailSort>('random');
  const [randomSeed] = useState(
    () => `trails-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  const [viewMode, setViewMode] = useState<TrailsViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapTrailSummary, setMapTrailSummary] = useState<Trail | null>(null);
  const [mapTrailId, setMapTrailId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [createEventTrailId, setCreateEventTrailId] = useState('');
  const [createEventSport, setCreateEventSport] = useState('');
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [requestTrailItem, setRequestTrailItem] = useState<Trail | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTrailName, setGalleryTrailName] = useState('Trail');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [requestFeedback, setRequestFeedback] = useState('');
  const [requestModalMessage, setRequestModalMessage] = useState('');
  const [requestedByTrailId, setRequestedByTrailId] = useState<Record<string, string>>({});
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState('Request sent');
  const [toastDescription, setToastDescription] = useState(
    'Your trail request has been submitted.'
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const initialPageSize = viewMode === 'quick' ? 10 : 3;
  const nextPageSize = viewMode === 'quick' ? 10 : 3;

  const getTrailImages = (trail: Trail) =>
    Array.from(
      new Set(
        [trail.image_url, ...(Array.isArray(trail.trail_images) ? trail.trail_images : [])].filter(
          (value): value is string => Boolean(value)
        )
      )
    );

  useEffect(() => {
    const closeTransientUi = () => {
      setRequestOpen(false);
      setMapOpen(false);
      setGalleryOpen(false);
      // Only reopen create-event if the URL explicitly asks for it.
      try {
        const url = new URL(window.location.href);
        const createTrail = url.searchParams.get('createEventTrail');
        if (!createTrail) {
          setCreateEventOpen(false);
          setCreateEventTrailId('');
          setCreateEventSport('');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('pageshow', closeTransientUi);
    return () => window.removeEventListener('pageshow', closeTransientUi);
  }, []);

  const { data: user = null } = useCurrentUser();
  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    enabled: !EXPERTS_BETA_ENABLED,
  });
  const queryClient = useQueryClient();
  const {
    data: mapTrailDetail,
    isLoading: loadingMapTrail,
    error: mapTrailError,
    refetch: refetchMapTrail,
  } = useQuery({
    queryKey: QUERY_KEYS.trails.mapById(mapTrailId),
    queryFn: ({ signal }) => fetchTrailMapById(mapTrailId as string, signal),
    enabled: Boolean(mapTrailId) && mapOpen,
    retry: 1,
  });
  const mapTrail = mapTrailDetail || mapTrailSummary;

  const loadParticipantRequests = async () => {
    if (!user || user.role !== 'participant') return;
    try {
      const response = await fetch('/api/participants/me/trail-requests');
      const data = await response.json();
      if (!response.ok) return;
      const map: Record<string, string> = {};
      (data.requests || []).forEach((req: { id: string; trail_id: string }) => {
        if (req.trail_id && req.id) map[req.trail_id] = req.id;
      });
      setRequestedByTrailId(map);
    } catch {
      // ignore
    }
  };

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
      distanceMin,
      distanceMax,
      rideProfile,
      sort,
      randomSeed,
      pageSize: initialPageSize,
    }),
    queryFn: ({ signal, pageParam }) =>
      fetchTrailsPaginated(
        {
          search,
          difficulty,
          location,
          sport,
          distanceMin,
          distanceMax,
          rideProfile,
          sort,
          randomSeed,
          offset: pageParam.offset,
          pageSize: pageParam.limit,
        },
        signal
      ),
    initialPageParam: { offset: 0, limit: initialPageSize } as TrailsPageParam,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const nextOffset = lastPageParam.offset + lastPage.trails.length;
      if (nextOffset >= lastPage.pagination.total) return undefined;
      return { offset: nextOffset, limit: nextPageSize } as TrailsPageParam;
    },
    placeholderData: (previousData) => previousData,
  });

  const requestMutation = useMutation({
    mutationFn: (payload: {
      trailId: string;
      description: string;
      expert_user_id?: string;
      preferred_date: string;
      preferred_time?: string;
      offered_price_npr?: number | null;
      nearest_point?: string;
      needs_paid_shuttle?: boolean;
    }) =>
      requestTrail(payload.trailId, {
        description: payload.description,
        expert_user_id: payload.expert_user_id,
        preferred_date: payload.preferred_date,
        preferred_time: payload.preferred_time,
        offered_price_npr: payload.offered_price_npr,
        nearest_point: payload.nearest_point,
        needs_paid_shuttle: payload.needs_paid_shuttle,
      }),
    onSuccess: () => {
      setRequestFeedback('Request submitted successfully.');
      setRequestModalMessage('Request submitted successfully.');
      setToastTitle('Request sent');
      setToastDescription('Your trail request was submitted successfully.');
      setToastOpen(true);
      loadParticipantRequests();
      setRequestOpen(false);
      setRequestTrailItem(null);
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

  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/participants/me/trail-requests/${requestId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to cancel request');
      }
      return data;
    },
    onSuccess: (_data, requestId) => {
      setRequestedByTrailId((prev) => {
        const next = { ...prev };
        const trailId = Object.keys(next).find((id) => next[id] === requestId);
        if (trailId) delete next[trailId];
        return next;
      });
      setToastTitle('Request cancelled');
      setToastDescription('Your trail request was cancelled.');
      setToastOpen(true);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel request.';
      setToastTitle('Cancel failed');
      setToastDescription(message);
      setToastOpen(true);
    },
  });

  const invalidateTrailsQueries = (trailId?: string) => {
    const infiniteKey = QUERY_KEYS.trails.infiniteList({
      search,
      difficulty,
      location,
      sport,
      distanceMin,
      distanceMax,
      rideProfile,
      sort,
      randomSeed,
      pageSize: initialPageSize,
    });
    const paginatedKey = QUERY_KEYS.trails.paginatedList({
      search,
      difficulty,
      location,
      sport,
      distanceMin,
      distanceMax,
      rideProfile,
      sort,
      randomSeed,
      page: 1,
      pageSize: initialPageSize,
    });
    const listKey = QUERY_KEYS.trails.list({
      search,
      difficulty,
      location,
      sport,
      distanceMin,
      distanceMax,
      rideProfile,
      sort,
      randomSeed,
    });

    if (trailId) {
      queryClient.setQueryData(infiniteKey, (current: any) => {
        if (!current?.pages) return current;
        return {
          ...current,
          pages: current.pages.map((page: any) => ({
            ...page,
            trails: (page.trails || []).filter((trail: any) => trail.id !== trailId),
          })),
        };
      });
    }

    queryClient.invalidateQueries({ queryKey: infiniteKey });
    queryClient.invalidateQueries({ queryKey: paginatedKey });
    queryClient.invalidateQueries({ queryKey: listKey });
    if (trailId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trails.byId(trailId) });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (trailId: string) => deleteTrail(trailId),
    onSuccess: (_data, trailId) => {
      setToastTitle('Trail deleted');
      setToastDescription('The trail has been permanently deleted.');
      setToastOpen(true);
      // Refresh the trails list
      invalidateTrailsQueries(trailId);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to delete trail.';
      setToastTitle('Delete failed');
      setToastDescription(message);
      setToastOpen(true);
    },
  });

  const hideMutation = useMutation({
    mutationFn: (trailId: string) => hideTrail(trailId),
    onSuccess: (_data, trailId) => {
      setToastTitle('Trail hidden');
      setToastDescription('The trail has been hidden from public view.');
      setToastOpen(true);
      // Refresh the trails list
      invalidateTrailsQueries(trailId);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to hide trail.';
      setToastTitle('Hide failed');
      setToastDescription(message);
      setToastOpen(true);
    },
  });

  const unhideMutation = useMutation({
    mutationFn: (trailId: string) => unhideTrail(trailId),
    onSuccess: (_data, trailId) => {
      setToastTitle('Trail visible');
      setToastDescription('The trail is now visible to all users.');
      setToastOpen(true);
      // Refresh the trails list
      invalidateTrailsQueries(trailId);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to unhide trail.';
      setToastTitle('Unhide failed');
      setToastDescription(message);
      setToastOpen(true);
    },
  });

  const trails = (data?.pages.flatMap((pageData) => pageData.trails) || []).map((trail) => ({
    ...trail,
    isRequested: Boolean(requestedByTrailId[trail.id]),
  }));
  const isAdmin = user?.role === 'admin';
  const isParticipant = user?.role === 'participant';
  const deletingTrailId = deleteMutation.isPending ? deleteMutation.variables : null;
  const hidingTrailId = hideMutation.isPending ? hideMutation.variables : null;
  const unhidingTrailId = unhideMutation.isPending ? unhideMutation.variables : null;
  const selectedCreateEventTrail =
    trails.find((trail) => trail.id === createEventTrailId) ?? null;
  const pagination =
    data && data.pages.length > 0
      ? data.pages[data.pages.length - 1].pagination
      : undefined;
  const isInitialLoading = isLoading && trails.length === 0;
  const isRefreshingResults = isFetching && !isFetchingNextPage && trails.length > 0;
  const hasTrailsData = trails.length > 0;
  const hasInitialError = Boolean(error) && !hasTrailsData;
  const hasTransientError = Boolean(error) && hasTrailsData;
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>(() => {
    if (typeof window === 'undefined') return 'map';
    const saved = window.localStorage.getItem('mtb_map_style_mode');
    return saved === 'map' || saved === 'satellite' ? saved : 'map';
  });
  const mapStyle = getMapLibreCompatibleMapStyle(mapStyleMode);
  useEffect(() => {
    try {
      window.localStorage.setItem('mtb_map_style_mode', mapStyleMode);
    } catch {
      // ignore
    }
  }, [mapStyleMode]);

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
    const urlDifficulty = normalizeDifficulty((searchParams.get('difficulty') || '').trim()) as
      | Difficulty
      | '';
    const urlLocation = (searchParams.get('location') || '').trim();
    const urlSport = (searchParams.get('sport') || '').trim();
    const urlDistanceMin = (searchParams.get('distanceMin') || '').trim();
    const urlDistanceMax = (searchParams.get('distanceMax') || '').trim();
    const urlRideProfile = (searchParams.get('rideProfile') || '').trim() as RideProfile;
    const urlSort = (searchParams.get('sort') || '').trim();
    const urlCreateTrail = (searchParams.get('createEventTrail') || '').trim();
    const urlCreateSport = (searchParams.get('createEventSport') || '').trim();
    const urlView = (searchParams.get('view') || '').trim();

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
    if (urlDistanceMin) {
      setDistanceMinInput(urlDistanceMin);
      setDistanceMin(urlDistanceMin);
    }
    if (urlDistanceMax) {
      setDistanceMaxInput(urlDistanceMax);
      setDistanceMax(urlDistanceMax);
    }
    if (urlRideProfile === 'short' || urlRideProfile === 'medium' || urlRideProfile === 'long') {
      setRideProfile(urlRideProfile);
    }
    if (urlSort && isTrailSort(urlSort)) {
      setSort(urlSort);
    } else {
      setSort('random');
    }
    if (urlCreateTrail) {
      setCreateEventTrailId(urlCreateTrail);
      setCreateEventSport(urlCreateSport || 'mtb');
      setCreateEventOpen(true);
    }
    if (urlView === 'quick') {
      setViewMode('quick');
    } else {
      setViewMode('grid');
    }
    didInitFromUrl.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!didInitFromUrl.current) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (difficulty) params.set('difficulty', difficulty);
    if (location) params.set('location', location);
    if (sport) params.set('sport', sport);
    if (distanceMin) params.set('distanceMin', distanceMin);
    if (distanceMax) params.set('distanceMax', distanceMax);
    if (rideProfile) params.set('rideProfile', rideProfile);
    if (sort && sort !== 'random') params.set('sort', sort);
    if (viewMode === 'quick') params.set('view', 'quick');
    if (createEventOpen && createEventTrailId) {
      params.set('createEventTrail', createEventTrailId);
      params.set('createEventSport', createEventSport || 'mtb');
    }
    const query = params.toString();
    const nextUrl = query ? `/trails?${query}` : '/trails';
    // Use history.replaceState to avoid route transition flicker while keeping URL in sync.
    if (typeof window !== 'undefined') {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl !== nextUrl) {
        window.history.replaceState(null, '', nextUrl);
      }
    }
  }, [
    search,
    difficulty,
    location,
    sport,
    distanceMin,
    distanceMax,
    rideProfile,
    sort,
    viewMode,
    createEventOpen,
    createEventTrailId,
    createEventSport,
  ]);

  useEffect(() => {
    if (!filtersOpen) return;
    setSearchInput(search);
    setLocationInput(location);
    setDistanceMinInput(distanceMin);
    setDistanceMaxInput(distanceMax);
    setDraftDifficulty(difficulty);
    setDraftSport(sport);
    setDraftRideProfile(rideProfile);
    setDraftSort(sort);
  }, [filtersOpen, search, location, distanceMin, distanceMax, difficulty, sport, rideProfile, sort]);

  useEffect(() => {
    if (!user || user.role !== 'participant') {
      setRequestedByTrailId({});
      return;
    }
    loadParticipantRequests();
  }, [user?.id, user?.role]);

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
    setSearch(searchInput.trim());
    setLocation(locationInput.trim());
    setDistanceMin(distanceMinInput.trim());
    setDistanceMax(distanceMaxInput.trim());
  };

  const hasActiveFilters = Boolean(
    search || difficulty || location || sport || distanceMin || distanceMax || rideProfile || sort !== 'random'
  );
  const activeFilterCount = [
    search,
    difficulty,
    location,
    sport,
    distanceMin,
    distanceMax,
    rideProfile,
    sort !== 'random' ? sort : '',
  ].filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-emerald-200/70 bg-white/90 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Trail Guide
              </p>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                Nepal
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">
              Find a Trail
            </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-slate-300">
            Pick a place, open a trail, and ride with confidence.
          </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-gray-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Default view
              </button>
              <button
                type="button"
                onClick={() => setViewMode('quick')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'quick'
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                Quick view
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {(user?.role === 'admin' || user?.role === 'expert') && (
              <button
                type="button"
                onClick={() => router.push('/upload')}
                className="rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700"
              >
                Create Trail
              </button>
            )}
          </div>
        </div>
        <form className="mt-4" onSubmit={handleSearch}>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <label htmlFor="trails-search" className="sr-only">
                Search trails
              </label>
              <input
                id="trails-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by trail or place"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none transition focus:ring-2 focus:ring-green-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              Search
            </button>
          </div>
        </form>
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
                Difficulty: {getDifficultyLabel(difficulty)} ×
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
            {sport && (
              <button
                type="button"
                onClick={() => setSport('')}
                className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
              >
                Sport: {TRAIL_SPORTS.find((s) => s.value === sport)?.label || sport} ×
              </button>
            )}
            {rideProfile && (
              <button
                type="button"
                onClick={() => setRideProfile('')}
                className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800"
              >
                Ride: {rideProfile === 'short' ? 'Short' : rideProfile === 'medium' ? 'Medium' : 'Long'} ×
              </button>
            )}
            {sort !== 'random' && (
              <button
                type="button"
                onClick={() => setSort('random')}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800"
              >
                Sort: {TRAIL_SORT_OPTIONS.find((option) => option.value === sort)?.label || sort} ×
              </button>
            )}
            {distanceMin && (
              <button
                type="button"
                onClick={() => {
                  setDistanceMin('');
                  setDistanceMinInput('');
                }}
                className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
              >
                Min distance: {distanceMin} km ×
              </button>
            )}
            {distanceMax && (
              <button
                type="button"
                onClick={() => {
                  setDistanceMax('');
                  setDistanceMaxInput('');
                }}
                className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
              >
                Max distance: {distanceMax} km ×
              </button>
            )}
          </div>
        )}
      </div>

      <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filter trails
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Narrow results by difficulty, location, sport type, and distance.
                </p>
              </div>
              <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Close
              </Dialog.Close>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
                setLocation(locationInput.trim());
                setDistanceMin(distanceMinInput.trim());
                setDistanceMax(distanceMaxInput.trim());
                setDifficulty(draftDifficulty);
                setSport(draftSport);
                setRideProfile(draftRideProfile);
                setSort(draftSort);
                setFiltersOpen(false);
              }}
              className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
              aria-label="Trail filters"
            >
              <div>
                <label htmlFor="trails-difficulty" className="mb-2 block text-sm font-medium">
                  Difficulty
                </label>
                <select
                  id="trails-difficulty"
                  value={draftDifficulty}
                  onChange={(e) => setDraftDifficulty(e.target.value as Difficulty | '')}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">All</option>
                  {TRAIL_DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="trails-location" className="mb-2 block text-sm font-medium">
                  Location
                </label>
                <input
                  id="trails-location"
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="City or region..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="trails-distance-min" className="mb-2 block text-sm font-medium">
                  Min distance (km)
                </label>
                <input
                  id="trails-distance-min"
                  type="number"
                  min="0"
                  value={distanceMinInput}
                  onChange={(e) => setDistanceMinInput(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="trails-distance-max" className="mb-2 block text-sm font-medium">
                  Max distance (km)
                </label>
                <input
                  id="trails-distance-max"
                  type="number"
                  min="0"
                  value={distanceMaxInput}
                  onChange={(e) => setDistanceMaxInput(e.target.value)}
                  placeholder="e.g. 40"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="trails-sport-modal" className="mb-2 block text-sm font-medium">
                  Category
                </label>
                <select
                  id="trails-sport-modal"
                  value={draftSport}
                  onChange={(event) => setDraftSport(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">All categories</option>
                  {TRAIL_SPORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="trails-sort-modal" className="mb-2 block text-sm font-medium">
                  Sort
                </label>
                <select
                  id="trails-sort-modal"
                  value={draftSort}
                  onChange={(event) => setDraftSort(event.target.value as TrailSort)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {TRAIL_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="trails-ride-profile-modal" className="mb-2 block text-sm font-medium">
                  Ride profile
                </label>
                <select
                  id="trails-ride-profile-modal"
                  value={draftRideProfile}
                  onChange={(event) => setDraftRideProfile(event.target.value as RideProfile)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {RIDE_PROFILE_QUICK_FILTERS.map((option) => (
                    <option key={option.value || 'all-rides'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 sm:w-auto"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setDifficulty('');
                    setLocationInput('');
                    setDistanceMinInput('');
                    setDistanceMaxInput('');
                    setDraftDifficulty('');
                    setDraftSport('');
                    setDraftRideProfile('');
                    setDraftSort('random');
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Reset all
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {isRefreshingResults && (
        <div
          className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
          role="status"
          aria-live="polite"
        >
          Updating trails...
        </div>
      )}
      {hasTransientError && (
        <div
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200"
          role="status"
          aria-live="polite"
        >
          Couldn’t refresh trails right now. Showing last available results.
        </div>
      )}

      {isInitialLoading ? (
        <>
          <p className="sr-only" role="status" aria-live="polite">
            Loading trails…
          </p>
          <TrailsPageSkeleton />
        </>
      ) : hasInitialError ? (
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
                setSport('');
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
            canRequestTrail={Boolean(isParticipant || !user)}
            isAdmin={isAdmin}
            onEditTrail={(trail) => {
              router.push(`/upload?trailId=${trail.id}`);
            }}
            onDeleteTrail={(trailId) => deleteMutation.mutate(trailId)}
            onHideTrail={(trailId) => hideMutation.mutate(trailId)}
            onUnhideTrail={(trailId) => unhideMutation.mutate(trailId)}
            deletingTrailId={deletingTrailId}
            hidingTrailId={hidingTrailId}
            unhidingTrailId={unhidingTrailId}
            onViewMap={(trail) => {
              setMapTrailSummary(trail);
              setMapTrailId(trail.id);
              setMapOpen(true);
            }}
            onOpenImageGallery={(trail) => {
              const images = getTrailImages(trail);
              if (!images.length) return;
              setGalleryTrailName(trail.name || 'Trail');
              setGalleryImages(images);
              setGalleryOpen(true);
            }}
            onRequestTrail={(trail) => {
              if (!user) {
                const next =
                  typeof window !== 'undefined'
                    ? `${window.location.pathname}${window.location.search}`
                    : '/trails';
                window.dispatchEvent(
                  new CustomEvent('open-register', {
                    detail: {
                      message: 'Create a participant account to request a trail activity.',
                      next,
                    },
                  })
                );
                return;
              }
              if (user.role !== 'participant') {
                return;
              }
              if (trail.isRequested) {
                return;
              }
              setRequestTrailItem(trail);
              setRequestOpen(true);
              setRequestFeedback('');
              setRequestModalMessage('');
            }}
            onCancelRequest={(trail) => {
              if (!user || user.role !== 'participant') {
                return;
              }
              const requestId = requestedByTrailId[trail.id];
              if (!requestId) return;
              const confirmed = window.confirm('Cancel your trail request?');
              if (!confirmed) return;
              cancelRequestMutation.mutate(requestId);
            }}
            onCreateEvent={(trail) => {
              setCreateEventTrailId(trail.id);
              setCreateEventSport(trail.sport_type || 'mtb');
              setCreateEventOpen(true);
            }}
          />

          {isFetchingNextPage && (
            <>
              <p className="sr-only" role="status" aria-live="polite">
                Loading more trails…
              </p>
              <TrailsLoadMoreSkeleton />
            </>
          )}
          {pagination && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row">
              <p className="text-sm text-gray-600">
                Showing {trails.length} of {pagination.total} trails
              </p>
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

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {(user?.role !== 'expert') && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-200">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 3l4 7-4 11-4-11 4-7z" fill="currentColor" />
                </svg>
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                For Participants
              </p>
            </div>
            <p>
              Discover local trails with safety tags, distance, and difficulty. Request a guided
              outing from verified experts when you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={() => router.push('/events')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              Explore events
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
        {(user?.role !== 'participant') && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M4 12h16M12 4v16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                For Experts
              </p>
              {EXPERTS_BETA_ENABLED && (
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                  Beta
                </span>
              )}
            </div>
            <p>
              Publish your best trails, manage safety labels, and showcase routes that help your
              community discover guided experiences.
            </p>
            <button
              type="button"
              onClick={() => router.push('/upload')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
            >
              Create a trail
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>

      <Dialog.Root
        open={mapOpen}
        onOpenChange={(open) => {
          setMapOpen(open);
          if (!open) {
            setMapTrailSummary(null);
            setMapTrailId(null);
          }
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
            {loadingMapTrail ? (
              <div className="grid h-[calc(82vh-52px)] place-items-center px-4 text-center text-sm text-gray-300">
                Loading trail route...
              </div>
            ) : mapTrailError ? (
              <div className="grid h-[calc(82vh-52px)] place-items-center px-4 text-center text-sm text-gray-300">
                <div className="space-y-3">
                  <p>{(mapTrailError as Error).message || 'Failed to load trail map.'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void refetchMapTrail();
                    }}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Retry map
                  </button>
                </div>
              </div>
            ) : mapTrailDetail?.route_data?.coordinates?.length ? (
              <Map
                initialViewState={(() => {
                  const routeData = mapTrailDetail.route_data as RouteData;
                  const bounds = getMapBounds(routeData);
                  if (bounds) {
                    return {
                      longitude: bounds.centerLon,
                      latitude: bounds.centerLat,
                      zoom: getInitialZoom(bounds),
                    };
                  }
                  return {
                    longitude: mapTrailDetail.longitude || 0,
                    latitude: mapTrailDetail.latitude || 0,
                    zoom: 12,
                  };
                })()}
                style={{ width: '100%', height: 'calc(82vh - 52px)' }}
                mapStyle={mapStyle}
              >
                <div className="absolute left-3 top-3 z-10 inline-flex overflow-hidden rounded-lg border border-white/15 bg-slate-950/70 shadow-lg backdrop-blur">
                  <button
                    type="button"
                    aria-pressed={mapStyleMode === 'satellite'}
                    onClick={() => setMapStyleMode('satellite')}
                    className={`px-3 py-2 text-xs font-semibold transition ${
                      mapStyleMode === 'satellite'
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                    title="Satellite imagery with places/labels"
                  >
                    Satellite
                  </button>
                  <button
                    type="button"
                    aria-pressed={mapStyleMode === 'map'}
                    onClick={() => setMapStyleMode('map')}
                    className={`px-3 py-2 text-xs font-semibold transition ${
                      mapStyleMode === 'map'
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                    title="Simple map view with places"
                  >
                    Map
                  </button>
                </div>
                <NavigationControl position="top-right" showCompass showZoom />
                <FullscreenControl position="top-right" />
                <ScaleControl position="bottom-left" unit="metric" />
                <Source
                  id="modal-route"
                  type="geojson"
                  data={getRouteGeoJSON(mapTrailDetail.route_data as RouteData) as any}
                >
                  <Layer
                    id="modal-route-glow"
                    type="line"
                    paint={{
                      'line-color': '#10b981',
                      'line-width': 10,
                      'line-opacity': 0.25,
                      'line-blur': 1.2,
                    }}
                  />
                  <Layer
                    id="modal-route-core"
                    type="line"
                    paint={{
                      'line-color': '#34d399',
                      'line-width': 4.5,
                      'line-opacity': 0.98,
                    }}
                  />
                </Source>
                {mapTrailDetail?.route_data?.coordinates?.length ? (
                  <Layer
                    id="modal-route-arrows-layer"
                    type="symbol"
                    source="modal-route"
                    layout={{
                      'symbol-placement': 'line',
                      'symbol-spacing': 120,
                      'text-field': '›',
                      'text-size': 28,
                      'text-rotation-alignment': 'map',
                      'text-keep-upright': false,
                      'text-offset': [0, 0],
                      'text-allow-overlap': true,
                      'text-ignore-placement': true,
                    }}
                    paint={{
                      'text-color': '#16a34a',
                      'text-halo-color': '#0f172a',
                      'text-halo-width': 1.2,
                    }}
                  />
                ) : null}
                <Marker
                  longitude={(mapTrailDetail.route_data as RouteData).coordinates[0].longitude}
                  latitude={(mapTrailDetail.route_data as RouteData).coordinates[0].latitude}
                  anchor="bottom"
                >
                  <div className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                    Start
                  </div>
                </Marker>
                <Marker
                  longitude={
                    (mapTrailDetail.route_data as RouteData).coordinates[
                      (mapTrailDetail.route_data as RouteData).coordinates.length - 1
                    ].longitude
                  }
                  latitude={
                    (mapTrailDetail.route_data as RouteData).coordinates[
                      (mapTrailDetail.route_data as RouteData).coordinates.length - 1
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

      <TrailImageCarouselModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        trailName={galleryTrailName}
        images={galleryImages}
      />

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

      <TrailRequestModal
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open);
          if (!open) {
            setRequestTrailItem(null);
          }
        }}
        trailOptions={
          requestTrailItem
            ? [
                {
                  id: requestTrailItem.id,
                  name: requestTrailItem.name,
                  sport_type: requestTrailItem.sport_type,
                },
              ]
            : trails.map((trail) => ({
                id: trail.id,
                name: trail.name,
                sport_type: trail.sport_type,
              }))
        }
        lockedTrailId={requestTrailItem?.id || null}
        experts={experts}
        expertsBetaEnabled={EXPERTS_BETA_ENABLED}
        isSubmitting={requestMutation.isPending}
        message={requestModalMessage}
        onMessageChange={setRequestModalMessage}
        onSubmit={(payload) => requestMutation.mutate(payload)}
      />

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
