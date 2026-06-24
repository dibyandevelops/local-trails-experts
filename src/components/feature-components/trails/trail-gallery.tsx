import Link from 'next/link';
import type { Trail } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { getTrailAttributionChipClass, getTrailAttributionLabel } from '@/lib/trail-attribution';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import type { TrailsViewMode } from './trail-view-toggle';
import { storeTrailsListState } from './trails-list-state';
import type { TrailSort } from './trails-page-options';

type RequestedTrail = Trail & { isRequested?: boolean };

function getDifficultyBadgeClass(difficulty: Trail['difficulty']) {
  switch (difficulty) {
    case 'novice':
      return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/70';
    case 'easy':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/70';
    case 'moderate':
    case 'medium':
      return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/70';
    case 'hard':
      return 'bg-orange-50 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/70';
    case 'expert':
      return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/70';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700';
  }
}

type TrailGalleryProps = {
  trails: RequestedTrail[];
  viewMode: TrailsViewMode;
  onViewMap: (trail: Trail) => void;
  onRequestTrail?: (trail: RequestedTrail) => void;
  onCancelRequest?: (trail: RequestedTrail) => void;
  onCreateEvent: (trail: Trail) => void;
  onOpenImageGallery?: (trail: Trail) => void;
  canRequestTrail: boolean;
  canCreateEvent: boolean;
  isAdmin: boolean;
  onEditTrail?: (trail: Trail) => void;
  onDeleteTrail?: (trailId: string) => void;
  onHideTrail?: (trailId: string) => void;
  onUnhideTrail?: (trailId: string) => void;
  onToggleExpertTrail?: (trail: Trail, isAssociated: boolean) => void;
  canAssociateExpertTrail: boolean;
  associatedTrailIds: Set<string>;
  deletingTrailId?: string | null;
  hidingTrailId?: string | null;
  unhidingTrailId?: string | null;
  associatingTrailId?: string | null;
  sort?: TrailSort;
  onSortChange?: (sort: TrailSort) => void;
};

export function TrailGallery({
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
  onToggleExpertTrail,
  canAssociateExpertTrail,
  associatedTrailIds,
  deletingTrailId,
  hidingTrailId,
  unhidingTrailId,
  associatingTrailId,
  sort = 'newest',
  onSortChange,
}: TrailGalleryProps) {
  if (viewMode === 'quick') {
    const sortHeaderClass =
      'inline-flex items-center gap-1 text-left transition hover:text-emerald-700 disabled:cursor-default disabled:hover:text-gray-500 dark:hover:text-emerald-200 dark:disabled:hover:text-slate-400';
    const getSortIndicator = (activeSorts: TrailSort[]) =>
      activeSorts.includes(sort) ? (sort.endsWith('_desc') ? '↓' : '↑') : '↕';
    const toggleNameSort = () => {
      onSortChange?.(sort === 'name_asc' ? 'name_desc' : 'name_asc');
    };
    const toggleDistanceSort = () => {
      onSortChange?.(sort === 'distance_asc' ? 'distance_desc' : 'distance_asc');
    };
    const toggleElevationSort = () => {
      onSortChange?.(sort === 'elevation_asc' ? 'elevation_desc' : 'elevation_asc');
    };
    const tableGridClass =
      'grid grid-cols-[minmax(0,1fr)_104px] md:grid-cols-[44px_minmax(0,1.45fr)_118px_190px_minmax(0,1fr)_152px]';

    return (
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-emerald-900/45 dark:bg-slate-950/70">
        <div className={`${tableGridClass} gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:border-emerald-900/50 dark:bg-slate-900/70 dark:text-slate-400`}>
          <span className="hidden md:block">#</span>
          <button
            type="button"
            onClick={toggleNameSort}
            disabled={!onSortChange}
            className={sortHeaderClass}
            title="Sort by trail name"
          >
            Trail <span aria-hidden="true">{getSortIndicator(['name_asc', 'name_desc'])}</span>
          </button>
          <span className="hidden md:block">Level</span>
          <span className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDistanceSort}
              disabled={!onSortChange}
              className={sortHeaderClass}
              title="Sort by distance"
            >
              Distance <span aria-hidden="true">{getSortIndicator(['distance_asc', 'distance_desc'])}</span>
            </button>
            <span className="text-gray-300 dark:text-slate-700">/</span>
            <button
              type="button"
              onClick={toggleElevationSort}
              disabled={!onSortChange}
              className={sortHeaderClass}
              title="Sort by elevation gain"
            >
              Elev. <span aria-hidden="true">{getSortIndicator(['elevation_asc', 'elevation_desc'])}</span>
            </button>
          </span>
          <span className="hidden md:block">Context</span>
          <span className="text-right">Actions</span>
        </div>
        {trails.map((trail, index) => {
          const distanceKm = Number(trail.distance_km);
          const elevationM = Number(trail.elevation_gain_m);
          const primaryTrailBuilder = trail.built_by_org_name
            ? { relation: 'built_by' as const, name: trail.built_by_org_name }
            : trail.maintained_by_org_name
              ? { relation: 'maintained_by' as const, name: trail.maintained_by_org_name }
              : trail.verified_by_org_name
                ? { relation: 'verified_by' as const, name: trail.verified_by_org_name }
                : null;
          const isAssociated = associatedTrailIds.has(trail.id);
          return (
            <div
              key={trail.id}
              className={`${tableGridClass} gap-3 border-b border-gray-100 px-4 py-3 transition last:border-b-0 hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:bg-emerald-950/20 md:items-center`}
            >
              <span className="hidden text-sm font-black text-gray-400 dark:text-slate-500 md:block">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link
                href={`/trails/${trail.slug || trail.id}`}
                onClick={storeTrailsListState}
                aria-label={`View details for ${trail.name}`}
                className="min-w-0"
              >
                <p className="truncate text-sm font-black text-gray-950 underline-offset-4 hover:underline dark:text-white">
                  {trail.name}
                </p>
                <p className="mt-1 truncate text-xs text-gray-600 dark:text-slate-300">
                  {trail.location || 'Kathmandu, Nepal'}
                </p>
              </Link>

              <div className="hidden md:block">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getDifficultyBadgeClass(trail.difficulty)}`}>
                  {getDifficultyLabel(trail.difficulty)}
                </span>
              </div>

              <div className="hidden text-xs font-semibold text-gray-700 dark:text-slate-200 md:grid md:grid-cols-2 md:gap-2">
                <span title="Distance">
                  {Number.isFinite(distanceKm) && distanceKm > 0
                    ? `${distanceKm.toFixed(1)} km`
                    : 'No distance'}
                </span>
                <span title="Elevation gain">
                  {Number.isFinite(elevationM) && elevationM > 0 ? `${elevationM} m gain` : 'No elevation'}
                </span>
              </div>

              <div className="hidden min-w-0 flex-wrap items-center gap-1.5 md:flex">
                {primaryTrailBuilder && (
                  <span
                    className={`inline-flex max-w-[180px] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTrailAttributionChipClass(primaryTrailBuilder.relation)}`}
                    title={`${getTrailAttributionLabel(primaryTrailBuilder.relation)}: ${primaryTrailBuilder.name}`}
                  >
                    <span className="truncate">
                      {getTrailAttributionLabel(primaryTrailBuilder.relation)}: {primaryTrailBuilder.name}
                    </span>
                  </span>
                )}
                {(trail.associated_expert_count || 0) > 0 && (
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200">
                    Expert
                  </span>
                )}
                {(trail.campaign_count || 0) > 0 && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    Campaign
                  </span>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => onViewMap(trail)}
                  className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                >
                  Map
                </button>
                {canRequestTrail && onRequestTrail && !trail.isRequested && (
                  <button
                    type="button"
                    onClick={() => onRequestTrail(trail)}
                    className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  >
                    Plan
                  </button>
                )}
                {canRequestTrail && onCancelRequest && trail.isRequested && (
                  <button
                    type="button"
                    onClick={() => onCancelRequest(trail)}
                    className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
                  >
                    Cancel
                  </button>
                )}
                {canCreateEvent && (
                  <button
                    type="button"
                    onClick={() => onCreateEvent(trail)}
                    className="hidden rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex"
                  >
                    Event
                  </button>
                )}
                {canAssociateExpertTrail && (
                <button
                  type="button"
                    onClick={() => onToggleExpertTrail?.(trail, isAssociated)}
                  disabled={Boolean(associatingTrailId)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isAssociated
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAssociated ? 'Pinned' : 'Pin'}
                </button>
                )}
              </div>
            </div>
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
            ...(canAssociateExpertTrail && onToggleExpertTrail
              ? {
                  isAssociatedToExpert: associatedTrailIds.has(trail.id),
                  associationLoading: Boolean(associatingTrailId),
                  onAssociateTrail() {
                    onToggleExpertTrail(trail, false);
                  },
                  onRemoveAssociation() {
                    onToggleExpertTrail(trail, true);
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
