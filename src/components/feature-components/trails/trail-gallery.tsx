import Link from 'next/link';
import type { Trail } from '@/types';
import { TrailCard } from '@/components/feature-components/trail-card';
import { getTrailAttributionChipClass, getTrailAttributionLabel } from '@/lib/trail-attribution';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import type { TrailsViewMode } from './trail-view-toggle';
import { storeTrailsListState } from './trails-list-state';

type RequestedTrail = Trail & { isRequested?: boolean };

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
}: TrailGalleryProps) {
  if (viewMode === 'quick') {
    return (
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-emerald-900/45 dark:bg-slate-950/70">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:border-emerald-900/50 dark:bg-slate-900/70 dark:text-slate-400 md:grid-cols-[42px_minmax(0,1.6fr)_120px_150px_minmax(0,1fr)_auto]">
          <span className="hidden md:block">#</span>
          <span>Trail</span>
          <span className="hidden md:block">Level</span>
          <span className="hidden md:block">Route</span>
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
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-100 px-4 py-3 transition last:border-b-0 hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:bg-emerald-950/20 md:grid-cols-[42px_minmax(0,1.6fr)_120px_150px_minmax(0,1fr)_auto] md:items-center"
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
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  {getDifficultyLabel(trail.difficulty)}
                </span>
              </div>

              <div className="hidden text-xs font-semibold text-gray-700 dark:text-slate-200 md:block">
                <span>
                  {Number.isFinite(distanceKm) && distanceKm > 0
                    ? `${distanceKm.toFixed(1)} km`
                    : 'Distance -'}
                </span>
                <span className="mx-1.5 text-gray-300 dark:text-slate-700">/</span>
                <span>
                  {Number.isFinite(elevationM) && elevationM > 0 ? `${elevationM} m` : 'Elev. -'}
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
                  {associatingTrailId === trail.id
                    ? 'Saving...'
                      : isAssociated
                        ? 'Pinned'
                        : 'Pin'}
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
