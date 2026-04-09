'use client';
import * as React from 'react';
import { Trail } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { getKomootNavigateUrl } from '@/lib/komoot';
import { getSportLabel } from '@/services/constants/sports';
import TrailImagePlaceholder from '@/components/ui/trail-image-placeholder';
import ThemedDropdown from '@/components/ui/themed-dropdown';

export type TrailCardProps = Trail & {
  detailsHref?: string;
  onBeforeNavigate?: () => void;
  onGroupRequest?: () => void;
  onOpenImageGallery?: () => void;
  hideLoading?: boolean;
  unhideLoading?: boolean;
  deleteLoading?: boolean;
  editLoading?: boolean;
  onEdit?: () => void;
  isRequested?: boolean;
  onCancelRequest?: () => void;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const komootNavigateUrl = React.useMemo(
    () => getKomootNavigateUrl(trail.komoot_embed_url),
    [trail.komoot_embed_url]
  );
  const distanceKmRaw = toFiniteNumber(trail.distance_km);
  const distanceKm = distanceKmRaw != null && distanceKmRaw > 0 ? distanceKmRaw : null;
  const estimatedHoursRaw = toFiniteNumber(trail.estimated_time_hours);
  const estimatedHours =
    estimatedHoursRaw != null && estimatedHoursRaw > 0 ? estimatedHoursRaw : null;
  const elevationGainMRaw = toFiniteNumber(trail.elevation_gain_m);
  const elevationGainM =
    elevationGainMRaw != null && elevationGainMRaw > 0 ? elevationGainMRaw : null;
  const ratingRaw = toFiniteNumber(trail.average_rating);
  const ratingValue =
    ratingRaw != null && (trail.review_count || 0) > 0 ? ratingRaw : null;
  const dropdownItems = [
    ...(trail.onCreateEvent
      ? [{ label: 'Create event', onSelect: () => trail.onCreateEvent?.() }]
      : []),
    ...(trail.onViewMap ? [{ label: 'View map', onSelect: () => trail.onViewMap?.() }] : []),
    ...(images.length > 0 && trail.onOpenImageGallery
      ? [{ label: 'View photos', onSelect: () => trail.onOpenImageGallery?.() }]
      : []),
    ...(komootNavigateUrl ? [{ label: 'Navigate', href: komootNavigateUrl }] : []),
    ...(trail.onCancelRequest && trail.isRequested
      ? [{ label: 'Cancel request', onSelect: () => trail.onCancelRequest?.(), tone: 'danger' as const }]
      : []),
    ...(trail.onEdit
      ? [
          {
            label: trail.editLoading ? 'Opening...' : 'Edit trail',
            disabled:
              trail.deleteLoading || trail.hideLoading || trail.unhideLoading || trail.editLoading,
            onSelect: () => trail.onEdit?.(),
          },
        ]
      : []),
    ...(trail.onUnhide && trail.is_hidden
      ? [
          {
            label: trail.unhideLoading ? 'Unhiding...' : 'Unhide trail',
            disabled: trail.unhideLoading || trail.deleteLoading || trail.hideLoading,
            onSelect: () => trail.onUnhide?.(),
          },
        ]
      : []),
    ...(trail.onHide && !trail.is_hidden
      ? [
          {
            label: trail.hideLoading ? 'Hiding...' : 'Hide trail',
            disabled: trail.hideLoading || trail.deleteLoading || trail.unhideLoading,
            onSelect: () => trail.onHide?.(),
          },
        ]
      : []),
    ...(trail.onDelete
      ? [
          {
            label: trail.deleteLoading ? 'Deleting...' : 'Delete trail',
            disabled: trail.deleteLoading || trail.hideLoading || trail.unhideLoading,
            onSelect: () => {
              if (
                confirm('Are you sure you want to delete this trail? This action cannot be undone.')
              ) {
                trail.onDelete?.();
              }
            },
            separatorBefore: true,
            tone: 'danger' as const,
          },
        ]
      : []),
  ];
  const hasActions = dropdownItems.length > 0;

  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-green-400 dark:border-slate-800 dark:bg-slate-900/60"
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
        {primaryImage ? (
          <div className="relative h-64 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            <Image
              src={primaryImage}
              alt={trail.name}
              fill
              className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              quality={90}
              loading="lazy"
            />
          </div>
        ) : (
          <TrailImagePlaceholder className="h-64 w-full" />
        )}
        <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[78%] rounded-xl px-3 py-2">
          <h3 className="truncate text-base font-bold uppercase tracking-wide text-white">
            {trail.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-white/90">{trail.location}</p>
        </div>
        {hasActions && (
          <div className="absolute right-3 top-3 z-20">
            <ThemedDropdown
              label="More actions"
              hideCaret
              triggerContent={
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-6 w-6 fill-slate-900 dark:fill-slate-100"
                >
                  <circle cx="10" cy="4" r="2.1" />
                  <circle cx="10" cy="10" r="2.1" />
                  <circle cx="10" cy="16" r="2.1" />
                </svg>
              }
              triggerClassName="h-9 w-9 justify-center rounded-full border border-slate-200 bg-white/95 px-0 py-0 text-slate-900 shadow-sm hover:bg-white dark:border-white/20 dark:bg-black/55 dark:text-white dark:hover:bg-black/40 focus-visible:ring-white/60"
              items={dropdownItems}
            />
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white">
            +{images.length - 1} more
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[11] bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 pb-4 pt-8">
          <div className="flex max-w-[85%] flex-wrap gap-2">
            {trail.sport_type && (
              <span className="inline-flex items-center justify-center rounded-full border border-emerald-300/70 bg-emerald-500/90 px-2.5 py-1 text-center text-[10px] leading-none font-semibold uppercase tracking-wide text-white">
                {getSportLabel(trail.sport_type)}
              </span>
            )}
            {distanceKm != null && (
              <span className="inline-flex items-center justify-center rounded-full border border-slate-200/30 bg-slate-900/60 px-2 py-0.5 text-center text-[10px] leading-none font-semibold text-white backdrop-blur-sm">
                {distanceKm.toFixed(1)} km
              </span>
            )}
            {trail.difficulty && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-center text-[10px] leading-none font-semibold capitalize text-white ${
                  trail.difficulty === 'easy'
                    ? 'border border-emerald-200/60 bg-emerald-600/85'
                    : trail.difficulty === 'medium'
                      ? 'border border-amber-200/60 bg-amber-500/90'
                      : 'border border-rose-200/60 bg-rose-600/85'
                }`}
              >
                {trail.difficulty}
              </span>
            )}
            {estimatedHours != null && (
              <span className="inline-flex items-center justify-center rounded-full border border-sky-200/60 bg-sky-600/85 px-2 py-0.5 text-center text-[10px] leading-none font-semibold text-white">
                ~{estimatedHours}h
              </span>
            )}
            {elevationGainM != null && (
              <span className="inline-flex items-center justify-center rounded-full border border-indigo-200/60 bg-indigo-600/85 px-2 py-0.5 text-center text-[10px] leading-none font-semibold text-white">
                ↑ {Math.round(elevationGainM)} m
              </span>
            )}
            {ratingValue != null && (
              <span className="inline-flex items-center justify-center rounded-full border border-amber-200/70 bg-amber-500/90 px-2 py-0.5 text-center text-[10px] leading-none font-semibold text-white">
                {ratingValue.toFixed(1)}★
              </span>
            )}
          </div>
        </div>
        </div>
      </div>
    </article>
  );
};

export default TrailCard;
