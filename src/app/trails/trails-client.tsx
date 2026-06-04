'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trail, Difficulty, RouteData, User, SportType } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { TRAIL_SPORTS } from '@/services/constants/sports';
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
import TrailImageCarouselModal from '@/components/ui/trail-image-carousel-modal';
import { getKomootNavigateUrl } from '@/lib/komoot';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import TrailRequestModal from '@/components/feature-components/trail-request/trail-request-modal';
import {
  getDifficultyLabel,
  TRAIL_DIFFICULTY_OPTIONS,
} from '@/services/constants/difficulty';
import { isShuttleEligibleSport } from '@/lib/shuttle';
import {
  TrailFilterChip,
  TrailGallery,
  TrailsLoadMoreSkeleton,
  TrailsPageSkeleton,
  TrailViewToggle,
  type TrailsViewMode,
} from '@/components/feature-components/trails';
import {
  clearTrailsScrollPosition,
  readTrailsScrollPosition,
} from '@/components/feature-components/trails/trails-list-state';
import { useTrailsFilters } from '@/components/feature-components/trails/hooks/use-trails-filters';
import {
  TrailsPageStateProvider,
  useTrailsPageState,
} from '@/components/feature-components/trails/trails-page-state-context';
import {
  RIDE_PROFILE_QUICK_FILTERS,
  TRAIL_SORT_OPTIONS,
  type RideProfile,
  type TrailSort,
} from '@/components/feature-components/trails/trails-page-options';

const EXPERT_ASSOCIATED_TRAILS_QUERY_KEY = ['expert-associated-trails'];

type TrailsPageParam = { offset: number; limit: number };
type ExpertTrailsResponse = {
  associated_trails?: Trail[];
};

function TrailsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRestoreScroll = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    filtersOpen,
    setFiltersOpen,
    mapTrailSummary,
    setMapTrailSummary,
    mapTrailId,
    setMapTrailId,
    mapOpen,
    setMapOpen,
    createEventTrailId,
    setCreateEventTrailId,
    createEventSport,
    setCreateEventSport,
    createEventOpen,
    setCreateEventOpen,
    requestTrailItem,
    setRequestTrailItem,
    requestOpen,
    setRequestOpen,
    galleryOpen,
    setGalleryOpen,
    galleryTrailName,
    setGalleryTrailName,
    galleryImages,
    setGalleryImages,
    toastOpen,
    setToastOpen,
    toastTitle,
    setToastTitle,
    toastDescription,
    setToastDescription,
    requestFeedback,
    setRequestFeedback,
    requestModalMessage,
    setRequestModalMessage,
    requestedByTrailId,
    setRequestedByTrailId,
  } = useTrailsPageState();

  const openCreateEventFromUrl = useCallback((trailId: string, sport: string) => {
    setCreateEventTrailId(trailId);
    setCreateEventSport(sport);
    setCreateEventOpen(true);
  }, [setCreateEventTrailId, setCreateEventSport, setCreateEventOpen]);

  const {
    activeFilterCount,
    applyDraftFilters,
    applySearch,
    draftDifficulty,
    draftRideProfile,
    draftSort,
    draftSport,
    filterQuery,
    hasActiveFilters,
    resetFilters,
    searchInput,
    setSearchInput,
    search,
    setSearch,
    difficulty,
    setDifficulty,
    locationInput,
    setLocationInput,
    location,
    setLocation,
    sport,
    setSport,
    distanceMinInput,
    setDistanceMinInput,
    distanceMaxInput,
    setDistanceMaxInput,
    distanceMin,
    setDistanceMin,
    distanceMax,
    setDistanceMax,
    rideProfile,
    setRideProfile,
    sort,
    setSort,
    setDraftDifficulty,
    setDraftRideProfile,
    setDraftSort,
    setDraftSport,
    setViewMode,
    syncDraftFilters,
    viewMode,
  } = useTrailsFilters({
    searchParams,
    createEventOpen,
    createEventTrailId,
    createEventSport,
    onCreateEventFromUrl: openCreateEventFromUrl,
  });

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
  const { data: expertTrailsData, isLoading: loadingExpertTrails } =
    useQuery<ExpertTrailsResponse>({
    queryKey: EXPERT_ASSOCIATED_TRAILS_QUERY_KEY,
    enabled: user?.role === 'expert',
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/experts/me/trails', { signal });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load associated trails');
      }
      return data as ExpertTrailsResponse;
    },
  });
  const associatedTrailIds = useMemo(
    () => new Set((expertTrailsData?.associated_trails || []).map((trail) => trail.id)),
    [expertTrailsData?.associated_trails]
  );
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
      ...filterQuery,
      pageSize: initialPageSize,
    }),
    queryFn: ({ signal, pageParam }) =>
      fetchTrailsPaginated(
        {
          ...filterQuery,
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

  const expertTrailAssociationMutation = useMutation({
    mutationFn: async (payload: { trailId: string; isAssociated: boolean }) => {
      const currentIds = Array.from(associatedTrailIds);
      const nextIds = payload.isAssociated
        ? currentIds.filter((trailId) => trailId !== payload.trailId)
        : [...currentIds, payload.trailId];

      if (!payload.isAssociated && currentIds.length >= 12) {
        throw new Error('You can associate up to 12 trails.');
      }

      const response = await fetch('/api/experts/me/trails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trail_ids: nextIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update associated trails');
      }
      return data as ExpertTrailsResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ExpertTrailsResponse>(
        EXPERT_ASSOCIATED_TRAILS_QUERY_KEY,
        (current) => ({
          ...(current || {}),
          associated_trails: data.associated_trails || [],
        })
      );
      setToastTitle('Expert trails updated');
      setToastDescription('Your expert profile trail list has been updated.');
      setToastOpen(true);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update associated trails.';
      setToastTitle('Update failed');
      setToastDescription(message);
      setToastOpen(true);
    },
  });

  const invalidateTrailsQueries = (trailId?: string) => {
    const infiniteKey = QUERY_KEYS.trails.infiniteList({
      ...filterQuery,
      pageSize: initialPageSize,
    });
    const paginatedKey = QUERY_KEYS.trails.paginatedList({
      ...filterQuery,
      page: 1,
      pageSize: initialPageSize,
    });
    const listKey = QUERY_KEYS.trails.list({
      ...filterQuery,
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
  const associatingTrailId = expertTrailAssociationMutation.isPending
    ? expertTrailAssociationMutation.variables?.trailId
    : null;
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
    const y = readTrailsScrollPosition();
    if (y === null) {
      didRestoreScroll.current = true;
      return;
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'auto' });
    });
    clearTrailsScrollPosition();
    didRestoreScroll.current = true;
  }, [isInitialLoading, trails.length]);

  useEffect(() => {
    if (!filtersOpen) return;
    syncDraftFilters();
  }, [filtersOpen, syncDraftFilters]);

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
    applySearch();
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 shadow-sm dark:border-emerald-800/60 dark:from-slate-950 dark:via-emerald-950/35 dark:to-lime-950/20 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-400/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl dark:bg-lime-400/10" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Nepal Trail Guide
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-black text-gray-950 dark:text-slate-50 sm:text-4xl">
              Find your next trail
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
              Search mapped routes, compare distance and difficulty, then open the trail details for maps, alerts, support, and local context.
            </p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <TrailViewToggle value={viewMode} onChange={setViewMode} />
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/80 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-900/45"
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
                className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
              >
                Create Trail
              </button>
            )}
          </div>
        </div>
        <form className="relative mt-5" onSubmit={handleSearch}>
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
                placeholder="Search Pharping, Chitlang, enduro, Kathmandu..."
                className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-700/50 dark:bg-slate-950/75 dark:text-slate-50 dark:placeholder:text-emerald-100/40 dark:focus:border-emerald-500/70"
              />
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
            >
              Search
            </button>
          </div>
        </form>
        {hasActiveFilters && (
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            {search && (
              <TrailFilterChip
                tone="green"
                onRemove={() => {
                  setSearch('');
                  setSearchInput('');
                }}
              >
                Search: {search}
              </TrailFilterChip>
            )}
            {difficulty && (
              <TrailFilterChip tone="blue" onRemove={() => setDifficulty('')}>
                Difficulty: {getDifficultyLabel(difficulty)}
              </TrailFilterChip>
            )}
            {location && (
              <TrailFilterChip
                tone="purple"
                onRemove={() => {
                  setLocation('');
                  setLocationInput('');
                }}
              >
                Location: {location}
              </TrailFilterChip>
            )}
            {sport && (
              <TrailFilterChip tone="amber" onRemove={() => setSport('')}>
                Sport:{' '}
                {TRAIL_SPORTS.find((s) => s.value === sport)?.label || sport}
              </TrailFilterChip>
            )}
            {rideProfile && (
              <TrailFilterChip tone="cyan" onRemove={() => setRideProfile('')}>
                Ride:{' '}
                {rideProfile === 'short'
                  ? 'Short'
                  : rideProfile === 'medium'
                    ? 'Medium'
                    : 'Long'}{' '}
              </TrailFilterChip>
            )}
            {sort !== 'newest' && (
              <TrailFilterChip tone="slate" onRemove={() => setSort('newest')}>
                Sort:{' '}
                {TRAIL_SORT_OPTIONS.find((option) => option.value === sort)
                  ?.label || sort}{' '}
              </TrailFilterChip>
            )}
            {distanceMin && (
              <TrailFilterChip
                tone="green"
                onRemove={() => {
                  setDistanceMin('');
                  setDistanceMinInput('');
                }}
              >
                Min distance: {distanceMin} km
              </TrailFilterChip>
            )}
            {distanceMax && (
              <TrailFilterChip
                tone="green"
                onRemove={() => {
                  setDistanceMax('');
                  setDistanceMaxInput('');
                }}
              >
                Max distance: {distanceMax} km
              </TrailFilterChip>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-white dark:border-emerald-800/60 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-emerald-950/30"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-emerald-900/60 dark:bg-slate-950 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-950 dark:text-slate-50">
                  Filter trails
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Narrow results by difficulty, location, sport, distance, and ride profile.
                </p>
              </div>
              <Dialog.Close className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
                ✕
              </Dialog.Close>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyDraftFilters();
                setFiltersOpen(false);
              }}
              className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
              aria-label="Trail filters"
            >
              <div>
                <label
                  htmlFor="trails-difficulty"
                  className="mb-2 block text-sm font-medium"
                >
                  Difficulty
                </label>
                <select
                  id="trails-difficulty"
                  value={draftDifficulty}
                  onChange={(e) =>
                    setDraftDifficulty(e.target.value as Difficulty | '')
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                <label
                  htmlFor="trails-location"
                  className="mb-2 block text-sm font-medium"
                >
                  Location
                </label>
                <input
                  id="trails-location"
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="City or region..."
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="trails-distance-min"
                  className="mb-2 block text-sm font-medium"
                >
                  Min distance (km)
                </label>
                <input
                  id="trails-distance-min"
                  type="number"
                  min="0"
                  value={distanceMinInput}
                  onChange={(e) => setDistanceMinInput(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="trails-distance-max"
                  className="mb-2 block text-sm font-medium"
                >
                  Max distance (km)
                </label>
                <input
                  id="trails-distance-max"
                  type="number"
                  min="0"
                  value={distanceMaxInput}
                  onChange={(e) => setDistanceMaxInput(e.target.value)}
                  placeholder="e.g. 40"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="trails-sport-modal"
                  className="mb-2 block text-sm font-medium"
                >
                  Category
                </label>
                <select
                  id="trails-sport-modal"
                  value={draftSport}
                  onChange={(event) => setDraftSport(event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                <label
                  htmlFor="trails-sort-modal"
                  className="mb-2 block text-sm font-medium"
                >
                  Sort
                </label>
                <select
                  id="trails-sort-modal"
                  value={draftSort}
                  onChange={(event) =>
                    setDraftSort(event.target.value as TrailSort)
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {TRAIL_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="trails-ride-profile-modal"
                  className="mb-2 block text-sm font-medium"
                >
                  Ride profile
                </label>
                <select
                  id="trails-ride-profile-modal"
                  value={draftRideProfile}
                  onChange={(event) =>
                    setDraftRideProfile(event.target.value as RideProfile)
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {RIDE_PROFILE_QUICK_FILTERS.map((option) => (
                    <option
                      key={option.value || 'all-rides'}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300 sm:w-auto"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
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
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
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
          <TrailsPageSkeleton viewMode={viewMode} />
        </>
      ) : hasInitialError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-10 text-center dark:border-red-900/60 dark:bg-red-950/25">
          <p className="text-sm font-semibold text-red-700 dark:text-red-200">{(error as Error).message}</p>
        </div>
      ) : trails.length === 0 ? (
        <div className="rounded-3xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            No trails found. Try adjusting your search criteria.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-900/45"
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
                      message:
                        'Create a participant account to request a trail activity.',
                      next,
                    },
                  }),
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
            canAssociateExpertTrail={
              user?.role === 'expert' && !loadingExpertTrails && Boolean(expertTrailsData)
            }
            associatedTrailIds={associatedTrailIds}
            associatingTrailId={associatingTrailId}
            onToggleExpertTrail={(trail, isAssociated) => {
              if (user?.role !== 'expert') return;
              expertTrailAssociationMutation.mutate({
                trailId: trail.id,
                isAssociated,
              });
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
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/80 p-3 dark:border-emerald-900/50 dark:bg-slate-950/60 sm:flex-row">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Showing {trails.length} of {pagination.total} trails
              </p>
            </div>
          )}
          <div ref={loadMoreRef} className="h-2 w-full" aria-hidden="true" />
          {requestFeedback && (
            <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              {requestFeedback}
            </div>
          )}
        </>
      )}

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
                  <p>
                    {(mapTrailError as Error).message ||
                      'Failed to load trail map.'}
                  </p>
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
                  data={
                    getRouteGeoJSON(
                      mapTrailDetail.route_data as RouteData,
                    ) as any
                  }
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
                  longitude={
                    (mapTrailDetail.route_data as RouteData).coordinates[0]
                      .longitude
                  }
                  latitude={
                    (mapTrailDetail.route_data as RouteData).coordinates[0]
                      .latitude
                  }
                  anchor="bottom"
                >
                  <div className="rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                    Start
                  </div>
                </Marker>
                <Marker
                  longitude={
                    (mapTrailDetail.route_data as RouteData).coordinates[
                      (mapTrailDetail.route_data as RouteData).coordinates
                        .length - 1
                    ].longitude
                  }
                  latitude={
                    (mapTrailDetail.route_data as RouteData).coordinates[
                      (mapTrailDetail.route_data as RouteData).coordinates
                        .length - 1
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
  return (
    <TrailsPageStateProvider>
      <TrailsPageContent />
    </TrailsPageStateProvider>
  );
}
