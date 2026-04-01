'use client';
import * as React from 'react';
import { Trail } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { getSafetyLabelText } from '@/lib/trail-safety';
import { getKomootNavigateUrl } from '@/lib/komoot';
import { getSportLabel } from '@/services/constants/sports';
import TrailImagePlaceholder from '@/components/ui/trail-image-placeholder';

export type TrailCardProps = Trail & {
  detailsHref?: string;
  onBeforeNavigate?: () => void;
  onGroupRequest?: () => void;
  hideLoading?: boolean;
  unhideLoading?: boolean;
  deleteLoading?: boolean;
  editLoading?: boolean;
  onEdit?: () => void;
  isRequested?: boolean;
  onCancelRequest?: () => void;
};

export const TrailCard: React.FunctionComponent<TrailCardProps> = (trail) => {
  const detailsHref = trail.detailsHref || `/trails/${trail.id}`;
  const images = React.useMemo(() => {
    const list = [
      ...(Array.isArray(trail.trail_images) ? trail.trail_images : []),
      trail.image_url,
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(list));
  }, [trail.trail_images, trail.image_url]);
  const primaryImage = images[0] || null;
  const hasImage = Boolean(primaryImage);
  const komootNavigateUrl = React.useMemo(
    () => getKomootNavigateUrl(trail.komoot_embed_url),
    [trail.komoot_embed_url]
  );
  const averageRating = typeof trail.average_rating === 'number' ? trail.average_rating : 0;
  const reviewCount = trail.review_count || 0;
  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={`trail-card-star-${trail.id}-${index}`} className="text-[11px]">
          {index < Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );

  return (
    <article
      className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-green-400 dark:border-slate-800 dark:bg-slate-900/60"
      aria-label={trail.name}
    >
      <Link
        href={detailsHref}
        onClick={() => trail.onBeforeNavigate?.()}
        aria-label={`View details for ${trail.name}`}
        className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <span className="sr-only">View details</span>
      </Link>

      <div className="relative">
        <div className="relative">
        {hasImage ? (
          <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            <Image
              src={primaryImage}
              alt={trail.name}
              fill
              className="scale-105 object-cover object-center blur-sm brightness-90"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              quality={60}
              aria-hidden="true"
            />
            <Image
              src={primaryImage}
              alt={trail.name}
              fill
              className="object-contain object-center p-2 transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              quality={90}
            />
            <div className="pointer-events-none absolute inset-0 bg-black/10" />
          </div>
        ) : (
          <TrailImagePlaceholder className="h-44 w-full" />
        )}
        {(trail.sport_type || trail.distance_km != null || trail.difficulty) && (
          <div className="absolute right-2 top-2 flex flex-wrap items-center justify-end gap-1.5">
            {trail.sport_type && (
              <span className="rounded-md bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white">
                {getSportLabel(trail.sport_type)}
              </span>
            )}
            {trail.distance_km != null && (
              <span className="rounded-md bg-slate-900/70 px-2 py-1 text-[11px] font-semibold text-white">
                {trail.distance_km} km
              </span>
            )}
            {trail.difficulty && (
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                  trail.difficulty === 'easy'
                    ? 'bg-green-600/90 text-white'
                    : trail.difficulty === 'medium'
                      ? 'bg-yellow-500/90 text-white'
                      : 'bg-red-600/90 text-white'
                }`}
              >
                {trail.difficulty}
              </span>
            )}
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 z-20 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            +{images.length - 1} more
          </div>
        )}
        </div>
        <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">{trail.name}</h3>
        </div>
        <p className="mb-2 text-sm text-gray-600">{trail.location}</p>
        {reviewCount > 0 && (
          <div className="mb-2 flex items-center gap-2 text-xs text-amber-700">
            <span className="font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
            {renderStars(averageRating)}
            <span className="text-gray-500">({reviewCount})</span>
          </div>
        )}

        {(trail.created_by || trail.expert_name) && (
          <p className="mb-3 text-xs font-medium text-blue-600">
            Added by: {trail.expert_name || trail.created_by}
          </p>
        )}
        <div className='mb-2 flex flex-wrap items-center gap-2' />
        {trail.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-700">
            {trail.description}
          </p>
        )}
        {(trail.onViewMap ||
          komootNavigateUrl ||
          trail.onRequestTrail ||
          trail.onCreateEvent ||
          trail.onCancelRequest ||
          trail.onDelete ||
          trail.onHide ||
          trail.onUnhide ||
          trail.onEdit) && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <div className="relative z-20 flex flex-wrap items-center gap-2">
              {trail.onCreateEvent && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onCreateEvent?.();
                  }}
                  className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                  title="Create an event using this trail"
                >
                  Create Event
                </button>
              )}
              {trail.onViewMap && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onViewMap?.();
                  }}
                  className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  title="Open this trail in map modal"
                >
                  View Map
                </button>
              )}
              {komootNavigateUrl && (
                <a
                  href={komootNavigateUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  title="Open this trail in Komoot"
                >
                  Navigate
                </a>
              )}
              {trail.onRequestTrail && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onRequestTrail?.();
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                    trail.isRequested
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
                  }`}
                  title={
                    trail.isRequested
                      ? 'Trail requested'
                      : 'Request this trail activity with preferred expert/date'
                  }
                >
                  {trail.isRequested ? 'Trail Requested' : 'Want to ride with a local pro?'}
                </button>
              )}
              {trail.onCancelRequest && trail.isRequested && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onCancelRequest?.();
                  }}
                  className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  title="Cancel your trail request"
                >
                  Cancel Request
                </button>
              )}
              {/* Hidden badge indicator */}
              {trail.is_hidden && (
                <span className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600">
                  Hidden
                </span>
              )}
              {trail.onEdit && (
                <button
                  type="button"
                  disabled={
                    trail.deleteLoading ||
                    trail.hideLoading ||
                    trail.unhideLoading ||
                    trail.editLoading
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onEdit?.();
                  }}
                  className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Edit trail details"
                >
                  {trail.editLoading ? 'Opening...' : 'Edit'}
                </button>
              )}
              {trail.onUnhide && trail.is_hidden && (
                <button
                  type="button"
                  disabled={
                    trail.unhideLoading ||
                    trail.deleteLoading ||
                    trail.hideLoading
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onUnhide?.();
                  }}
                  className="rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Make this trail visible again"
                >
                  {trail.unhideLoading ? 'Unhiding...' : 'Unhide'}
                </button>
              )}
              {trail.onHide && !trail.is_hidden && (
                <button
                  type="button"
                  disabled={
                    trail.hideLoading ||
                    trail.deleteLoading ||
                    trail.unhideLoading
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    trail.onHide?.();
                  }}
                  className="rounded-md border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-800 hover:bg-yellow-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Hide this trail from public view"
                >
                  {trail.hideLoading ? 'Hiding...' : 'Hide'}
                </button>
              )}
              {trail.onDelete && (
                <button
                  type="button"
                  disabled={
                    trail.deleteLoading ||
                    trail.hideLoading ||
                    trail.unhideLoading
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (
                      confirm(
                        'Are you sure you want to delete this trail? This action cannot be undone.',
                      )
                    ) {
                      trail.onDelete?.();
                    }
                  }}
                  className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Delete this trail permanently"
                >
                  {trail.deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </article>
  );
};

export default TrailCard;
