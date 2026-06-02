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
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {trails.map((trail) => {
          const distanceKm = Number(trail.distance_km);
          const elevationM = Number(trail.elevation_gain_m);
          return (
            <div
              key={trail.id}
              className="group rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <Link
                href={`/trails/${trail.slug || trail.id}`}
                onClick={storeTrailsListState}
                aria-label={`View details for ${trail.name}`}
                className="block"
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
                      : 'Distance -'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                    {Number.isFinite(elevationM) && elevationM > 0
                      ? `${elevationM} m`
                      : 'Elevation -'}
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
                  {(trail.associated_expert_count || 0) > 0 && (
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                      Local expert
                    </span>
                  )}
                </div>
              </Link>
              {canAssociateExpertTrail && (
                <button
                  type="button"
                  onClick={() => onToggleExpertTrail?.(trail, associatedTrailIds.has(trail.id))}
                  disabled={Boolean(associatingTrailId)}
                  className={`mt-2 w-full rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    associatedTrailIds.has(trail.id)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {associatingTrailId === trail.id
                    ? 'Saving...'
                    : associatedTrailIds.has(trail.id)
                      ? 'Pinned to profile'
                      : 'Pin to expert profile'}
                </button>
              )}
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
