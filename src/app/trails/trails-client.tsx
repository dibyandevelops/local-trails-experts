'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Trail } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';

import { TRAIL_SPORTS } from '@/services/constants/sports';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import {
  getDifficultyLabel,
} from '@/services/constants/difficulty';
import { useTrailsFilters } from '@/hooks/trails/use-trails-filters';
import {
  TrailsPageStateProvider,
  useTrailsPageState,
} from '@/components/feature-components/trails/trails-page-state-context';
import {
  TRAIL_SORT_OPTIONS,
} from '@/components/feature-components/trails/trails-page-options';
import { useTrailsPageData } from '@/hooks/trails/use-trails-page-data';
import {
  usePageShowReset,
  useSyncOpenFilters,
  useTrailsScrollLoading,
} from '@/hooks/trails/use-trails-page-lifecycle';
import { useTrailsMapStyle } from '@/hooks/trails/use-trails-map-style';
import {
  TrailsPageHeader,
  type ActiveTrailFilterChip,
} from '@/components/feature-components/trails/trails-page-header';
import { TrailsFilterDialog } from '@/components/feature-components/trails/trails-filter-dialog';
import { TrailsResults } from '@/components/feature-components/trails/trails-results';
import {
  CreateTrailEventDialog,
  TrailMapDialog,
  TrailsToast,
} from '@/components/feature-components/trails/trails-page-dialogs';

const TrailImageCarouselModal = dynamic(() => import('@/components/ui/trail-image-carousel-modal'), {
  ssr: false,
});

const TrailRequestModal = dynamic(
  () => import('@/components/feature-components/trail-request/trail-request-modal'),
  {
    ssr: false,
  }
);

function TrailsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const getTrailImages = (trail: Trail) =>
    Array.from(
      new Set(
        [trail.image_url, ...(Array.isArray(trail.trail_images) ? trail.trail_images : [])].filter(
          (value): value is string => Boolean(value)
        )
      )
    );

  const resetTransientUi = useCallback(() => {
    setRequestOpen(false);
    setMapOpen(false);
    setGalleryOpen(false);
    const createTrail = new URL(window.location.href).searchParams.get('createEventTrail');
    if (!createTrail) {
      setCreateEventOpen(false);
      setCreateEventTrailId('');
      setCreateEventSport('');
    }
  }, [
    setCreateEventOpen,
    setCreateEventSport,
    setCreateEventTrailId,
    setGalleryOpen,
    setMapOpen,
    setRequestOpen,
  ]);
  usePageShowReset(resetTransientUi);

  const showToast = useCallback(
    (title: string, description: string) => {
      setToastTitle(title);
      setToastDescription(description);
      setToastOpen(true);
    },
    [setToastDescription, setToastOpen, setToastTitle]
  );

  const handleRequestMessage = useCallback(
    (message: string) => {
      setRequestFeedback(message);
      setRequestModalMessage(message);
    },
    [setRequestFeedback, setRequestModalMessage]
  );

  const handleRequestSuccess = useCallback(() => {
    setRequestOpen(false);
    setRequestTrailItem(null);
  }, [setRequestOpen, setRequestTrailItem]);

  const {
    user,
    loadingCurrentUser,
    experts,
    trails,
    pagination,
    requestedByTrailId,
    savedTrailIds,
    associatedTrailIds,
    guideTrailsData: expertTrailsData,
    loadingGuideTrails: loadingExpertTrails,
    mapTrail,
    mapTrailDetail,
    loadingMapTrail,
    mapTrailError,
    refetchMapTrail,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    requestMutation,
    cancelRequestMutation,
    savedTrailMutation,
    guideTrailMutation: expertTrailAssociationMutation,
    deleteMutation,
    hideMutation,
    unhideMutation,
  } = useTrailsPageData({
    filterQuery,
    pageSize: initialPageSize,
    loadExperts: requestOpen,
    mapTrailId,
    mapOpen,
    mapTrailSummary,
    onToast: showToast,
    onRequestMessage: handleRequestMessage,
    onRequestSuccess: handleRequestSuccess,
  });

  const isAdmin = user?.role === 'admin';
  const isParticipant = user?.role === 'participant';
  const deletingTrailId = deleteMutation.isPending ? deleteMutation.variables : null;
  const hidingTrailId = hideMutation.isPending ? hideMutation.variables : null;
  const unhidingTrailId = unhideMutation.isPending ? unhideMutation.variables : null;
  const associatingTrailId = expertTrailAssociationMutation.isPending
    ? expertTrailAssociationMutation.variables?.trailId
    : null;
  const savingTrailId = savedTrailMutation.isPending
    ? savedTrailMutation.variables?.trailId
    : null;
  const selectedCreateEventTrail =
    trails.find((trail) => trail.id === createEventTrailId) ?? null;
  const isInitialLoading = isLoading && trails.length === 0;
  const isRefreshingResults = isFetching && !isFetchingNextPage && trails.length > 0;
  const hasTrailsData = trails.length > 0;
  const hasInitialError = Boolean(error) && !hasTrailsData;
  const hasTransientError = Boolean(error) && hasTrailsData;
  const { mapStyle, mapStyleMode, setMapStyleMode } = useTrailsMapStyle();
  useSyncOpenFilters(filtersOpen, syncDraftFilters);
  const loadMoreRef = useTrailsScrollLoading({
    isInitialLoading,
    trailsLength: trails.length,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    isLoading,
    fetchNextPage,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch();
  };

  const openTrailRequest = (trail: Trail | null = null) => {
    if (loadingCurrentUser) {
      setToastTitle('Checking account');
      setToastDescription('Please try again in a second.');
      setToastOpen(true);
      return;
    }
    if (!user) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/trails';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: {
            message: 'Create a participant account to plan a ride with a local guide.',
            next,
          },
        })
      );
      return;
    }
    if (user.role !== 'participant') {
      setToastTitle('Participant account required');
      setToastDescription('Trail activity requests are available from participant accounts.');
      setToastOpen(true);
      return;
    }
    if (trail?.isRequested) return;

    setRequestTrailItem(trail);
    setRequestFeedback('');
    setRequestModalMessage('');
    setRequestOpen(true);
  };

  const activeFilters: ActiveTrailFilterChip[] = [];
  if (search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${search}`,
      tone: 'green',
      onRemove: () => {
        setSearch('');
        setSearchInput('');
      },
    });
  }
  if (difficulty) {
    activeFilters.push({
      key: 'difficulty',
      label: `Difficulty: ${getDifficultyLabel(difficulty)}`,
      tone: 'blue',
      onRemove: () => setDifficulty(''),
    });
  }
  if (location) {
    activeFilters.push({
      key: 'location',
      label: `Location: ${location}`,
      tone: 'purple',
      onRemove: () => {
        setLocation('');
        setLocationInput('');
      },
    });
  }
  if (sport) {
    activeFilters.push({
      key: 'sport',
      label: `Sport: ${TRAIL_SPORTS.find((option) => option.value === sport)?.label || sport}`,
      tone: 'amber',
      onRemove: () => setSport(''),
    });
  }
  if (rideProfile) {
    const rideLabel = rideProfile === 'short' ? 'Short' : rideProfile === 'medium' ? 'Medium' : 'Long';
    activeFilters.push({
      key: 'ride-profile',
      label: `Ride: ${rideLabel}`,
      tone: 'cyan',
      onRemove: () => setRideProfile(''),
    });
  }
  if (sort !== 'newest') {
    activeFilters.push({
      key: 'sort',
      label: `Sort: ${TRAIL_SORT_OPTIONS.find((option) => option.value === sort)?.label || sort}`,
      tone: 'slate',
      onRemove: () => setSort('newest'),
    });
  }
  if (distanceMin) {
    activeFilters.push({
      key: 'distance-min',
      label: `Min distance: ${distanceMin} km`,
      tone: 'green',
      onRemove: () => {
        setDistanceMin('');
        setDistanceMinInput('');
      },
    });
  }
  if (distanceMax) {
    activeFilters.push({
      key: 'distance-max',
      label: `Max distance: ${distanceMax} km`,
      tone: 'green',
      onRemove: () => {
        setDistanceMax('');
        setDistanceMaxInput('');
      },
    });
  }

  const toggleSavedTrail = (trail: Trail) => {
    if (loadingCurrentUser) {
      showToast('Checking account', 'Please try again in a second.');
      return;
    }
    if (!user) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/trails';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: { message: 'Create an account to save trails for later.', next },
        })
      );
      return;
    }
    savedTrailMutation.mutate({
      trailId: trail.id,
      isSaved: savedTrailIds.has(trail.id),
    });
  };

  const cancelTrailRequest = (trail: Trail) => {
    if (user?.role !== 'participant') return;
    const requestId = requestedByTrailId[trail.id];
    if (!requestId || !window.confirm('Cancel your trail request?')) return;
    cancelRequestMutation.mutate(requestId);
  };

  const openTrailMap = (trail: Trail) => {
    setMapTrailSummary(trail);
    setMapTrailId(trail.id);
    setMapOpen(true);
  };

  const openTrailGallery = (trail: Trail) => {
    const images = getTrailImages(trail);
    if (!images.length) return;
    setGalleryTrailName(trail.name || 'Trail');
    setGalleryImages(images);
    setGalleryOpen(true);
  };

  const openCreateEvent = (trail: Trail) => {
    setCreateEventTrailId(trail.id);
    setCreateEventSport(trail.sport_type || 'mtb');
    setCreateEventOpen(true);
  };

  return (
    <div className="space-y-6">
      <TrailsPageHeader
        viewMode={viewMode}
        activeFilterCount={activeFilterCount}
        searchInput={searchInput}
        activeFilters={activeFilters}
        canUploadTrails={user?.role === 'admin' || user?.role === 'expert'}
        onViewModeChange={setViewMode}
        onOpenFilters={() => setFiltersOpen(true)}
        onUploadTrails={() => router.push('/upload')}
        onPlanWithGuide={() => openTrailRequest()}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onClearFilters={resetFilters}
      />

      <TrailsFilterDialog
        open={filtersOpen}
        difficulty={draftDifficulty}
        location={locationInput}
        distanceMin={distanceMinInput}
        distanceMax={distanceMaxInput}
        sport={draftSport}
        sort={draftSort}
        rideProfile={draftRideProfile}
        onOpenChange={setFiltersOpen}
        onDifficultyChange={setDraftDifficulty}
        onLocationChange={setLocationInput}
        onDistanceMinChange={setDistanceMinInput}
        onDistanceMaxChange={setDistanceMaxInput}
        onSportChange={setDraftSport}
        onSortChange={setDraftSort}
        onRideProfileChange={setDraftRideProfile}
        onApply={applyDraftFilters}
        onReset={resetFilters}
      />

      <TrailsResults
        trails={trails}
        viewMode={viewMode}
        sort={sort}
        pagination={pagination}
        error={error instanceof Error ? error : null}
        isInitialLoading={isInitialLoading}
        isRefreshing={isRefreshingResults}
        isFetchingNextPage={isFetchingNextPage}
        hasInitialError={hasInitialError}
        hasTransientError={hasTransientError}
        hasActiveFilters={hasActiveFilters}
        canCreateEvent={user?.role === 'admin' || user?.role === 'expert'}
        canRequestTrail={Boolean(isParticipant || !user)}
        isAdmin={isAdmin}
        canAssociateGuideTrail={
          user?.role === 'expert' && !loadingExpertTrails && Boolean(expertTrailsData)
        }
        savedTrailIds={savedTrailIds}
        associatedTrailIds={associatedTrailIds}
        savingTrailId={savingTrailId}
        deletingTrailId={deletingTrailId}
        hidingTrailId={hidingTrailId}
        unhidingTrailId={unhidingTrailId}
        associatingTrailId={associatingTrailId}
        requestFeedback={requestFeedback}
        loadMoreRef={loadMoreRef}
        onResetFilters={resetFilters}
        onSortChange={setSort}
        onToggleSavedTrail={toggleSavedTrail}
        onEditTrail={(trail) => router.push(`/upload?trailId=${trail.id}`)}
        onDeleteTrail={(trailId) => deleteMutation.mutate(trailId)}
        onHideTrail={(trailId) => hideMutation.mutate(trailId)}
        onUnhideTrail={(trailId) => unhideMutation.mutate(trailId)}
        onViewMap={openTrailMap}
        onOpenImageGallery={openTrailGallery}
        onRequestTrail={openTrailRequest}
        onCancelRequest={cancelTrailRequest}
        onCreateEvent={openCreateEvent}
        onToggleGuideTrail={(trail, isAssociated) => {
          if (user?.role !== 'expert') return;
          expertTrailAssociationMutation.mutate({ trailId: trail.id, isAssociated });
        }}
      />

      <TrailMapDialog
        open={mapOpen}
        trail={mapTrail}
        detail={mapTrailDetail}
        loading={loadingMapTrail}
        error={mapTrailError instanceof Error ? mapTrailError : null}
        mapStyle={mapStyle}
        mapStyleMode={mapStyleMode}
        onOpenChange={(open) => {
          setMapOpen(open);
          if (!open) {
            setMapTrailSummary(null);
            setMapTrailId(null);
          }
        }}
        onRetry={() => {
          void refetchMapTrail();
        }}
        onMapStyleModeChange={setMapStyleMode}
      />

      <TrailImageCarouselModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        trailName={galleryTrailName}
        images={galleryImages}
      />

      <CreateTrailEventDialog
        open={createEventOpen}
        trailId={createEventTrailId}
        sport={createEventSport}
        trail={selectedCreateEventTrail}
        user={user}
        onOpenChange={(open) => {
          setCreateEventOpen(open);
          if (!open) {
            setCreateEventTrailId('');
            setCreateEventSport('');
          }
        }}
        onCompleted={() => {
          showToast('Event created', 'Your event was created successfully.');
          setCreateEventOpen(false);
          setCreateEventTrailId('');
          setCreateEventSport('');
        }}
      />

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

      <TrailsToast
        open={toastOpen}
        title={toastTitle}
        description={toastDescription}
        onOpenChange={setToastOpen}
      />
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
