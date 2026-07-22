import type { RefObject } from 'react';
import type { Trail } from '@/types';
import type { TrailsPagination } from '@/services/trails/trails.service';
import { TrailGallery } from './trail-gallery';
import { TrailsLoadMoreSkeleton, TrailsPageSkeleton } from './trails-page-skeletons';
import type { TrailsViewMode } from './trail-view-toggle';
import type { TrailSort } from './trails-page-options';

type TrailsResultsProps = {
  trails: Trail[];
  viewMode: TrailsViewMode;
  sort: TrailSort;
  pagination?: TrailsPagination;
  error: Error | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isFetchingNextPage: boolean;
  hasInitialError: boolean;
  hasTransientError: boolean;
  hasActiveFilters: boolean;
  canCreateEvent: boolean;
  canRequestTrail: boolean;
  isAdmin: boolean;
  canAssociateGuideTrail: boolean;
  savedTrailIds: Set<string>;
  associatedTrailIds: Set<string>;
  savingTrailId: string | null;
  deletingTrailId: string | null;
  hidingTrailId: string | null;
  unhidingTrailId: string | null;
  associatingTrailId: string | null;
  requestFeedback: string;
  loadMoreRef: RefObject<HTMLDivElement>;
  previewGateRef: RefObject<HTMLDivElement>;
  showPreviewGate: boolean;
  onResetFilters: () => void;
  onSortChange: (sort: TrailSort) => void;
  onToggleSavedTrail: (trail: Trail) => void;
  onEditTrail: (trail: Trail) => void;
  onDeleteTrail: (trailId: string) => void;
  onHideTrail: (trailId: string) => void;
  onUnhideTrail: (trailId: string) => void;
  onViewMap: (trail: Trail) => void;
  onOpenImageGallery: (trail: Trail) => void;
  onRequestTrail: (trail: Trail) => void;
  onCancelRequest: (trail: Trail) => void;
  onCreateEvent: (trail: Trail) => void;
  onToggleGuideTrail: (trail: Trail, isAssociated: boolean) => void;
};

export function TrailsResults({
  trails,
  viewMode,
  sort,
  pagination,
  error,
  isInitialLoading,
  isRefreshing,
  isFetchingNextPage,
  hasInitialError,
  hasTransientError,
  hasActiveFilters,
  canCreateEvent,
  canRequestTrail,
  isAdmin,
  canAssociateGuideTrail,
  savedTrailIds,
  associatedTrailIds,
  savingTrailId,
  deletingTrailId,
  hidingTrailId,
  unhidingTrailId,
  associatingTrailId,
  requestFeedback,
  loadMoreRef,
  previewGateRef,
  showPreviewGate,
  onResetFilters,
  onSortChange,
  onToggleSavedTrail,
  onEditTrail,
  onDeleteTrail,
  onHideTrail,
  onUnhideTrail,
  onViewMap,
  onOpenImageGallery,
  onRequestTrail,
  onCancelRequest,
  onCreateEvent,
  onToggleGuideTrail,
}: TrailsResultsProps) {
  if (isInitialLoading) {
    return (
      <>
        <p className="sr-only" role="status" aria-live="polite">Loading trails...</p>
        <TrailsPageSkeleton viewMode={viewMode} />
      </>
    );
  }

  if (hasInitialError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-10 text-center dark:border-red-900/60 dark:bg-red-950/25">
        <p className="text-sm font-semibold text-red-700 dark:text-red-200">{error?.message}</p>
      </div>
    );
  }

  if (trails.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm dark:border-emerald-900/50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">No trails found. Try adjusting your search criteria.</p>
        {hasActiveFilters && <button type="button" onClick={onResetFilters} className="mt-4 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-100">Clear filters</button>}
      </div>
    );
  }

  return (
    <>
      {hasTransientError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200" role="status" aria-live="polite">
          Could not refresh trails right now. Showing the last available results.
        </div>
      )}
      <div className={`relative transition-opacity duration-150 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`} aria-busy={isRefreshing}>
        {isRefreshing && <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"><div className="h-full w-1/3 animate-[trail-refresh_900ms_ease-in-out_infinite] rounded-full bg-emerald-600 dark:bg-emerald-300" /></div>}
        <TrailGallery
          trails={trails}
          viewMode={viewMode}
          canCreateEvent={canCreateEvent}
          canRequestTrail={canRequestTrail}
          isAdmin={isAdmin}
          savedTrailIds={savedTrailIds}
          savingTrailId={savingTrailId}
          onToggleSavedTrail={onToggleSavedTrail}
          onEditTrail={onEditTrail}
          onDeleteTrail={onDeleteTrail}
          onHideTrail={onHideTrail}
          onUnhideTrail={onUnhideTrail}
          deletingTrailId={deletingTrailId}
          hidingTrailId={hidingTrailId}
          unhidingTrailId={unhidingTrailId}
          onViewMap={onViewMap}
          onOpenImageGallery={onOpenImageGallery}
          onRequestTrail={onRequestTrail}
          onCancelRequest={onCancelRequest}
          onCreateEvent={onCreateEvent}
          canAssociateExpertTrail={canAssociateGuideTrail}
          associatedTrailIds={associatedTrailIds}
          associatingTrailId={associatingTrailId}
          sort={sort}
          onSortChange={onSortChange}
          onToggleExpertTrail={onToggleGuideTrail}
        />
      </div>
      {showPreviewGate && (
        <div
          ref={previewGateRef}
          className="mt-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 text-center shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/35 dark:via-slate-950 dark:to-slate-900"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800 dark:text-lime-200">
            Trail preview
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-emerald-950 dark:text-white">
            Sign in to keep exploring.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-950/75 dark:text-slate-300">
            The first three trails are open as a preview. Create a free account or sign in to view
            more routes, save trails, and plan rides with local support.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = `${window.location.pathname}${window.location.search}`;
                window.dispatchEvent(
                  new CustomEvent('open-register', {
                    detail: {
                      message: 'Create a free account to view more local trails.',
                      next,
                    },
                  })
                );
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-800 px-5 text-sm font-black text-white transition hover:bg-emerald-700 dark:bg-lime-300 dark:text-emerald-950 dark:hover:bg-lime-200"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => {
                const next = `${window.location.pathname}${window.location.search}`;
                window.dispatchEvent(
                  new CustomEvent('open-login', {
                    detail: {
                      message: 'Sign in to continue viewing trails.',
                      next,
                    },
                  })
                );
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-emerald-300 bg-white px-5 text-sm font-black text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
            >
              Sign in
            </button>
          </div>
        </div>
      )}
      {isFetchingNextPage && <><p className="sr-only" role="status" aria-live="polite">Loading more trails...</p><TrailsLoadMoreSkeleton viewMode={viewMode} /></>}
      {pagination && <div className="mt-6 rounded-2xl border border-gray-200 bg-white/80 p-3 dark:border-emerald-900/50 dark:bg-slate-950/60"><p className="text-sm text-gray-600 dark:text-slate-300">Showing {trails.length} of {pagination.total} trails</p></div>}
      {!showPreviewGate && <div ref={loadMoreRef} className="h-2 w-full" aria-hidden="true" />}
      {requestFeedback && <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{requestFeedback}</div>}
    </>
  );
}
