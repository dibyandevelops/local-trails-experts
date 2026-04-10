'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trail } from '@/types';
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

const dataLabelClass =
  'text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400';
const dataValueClass = 'mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100';

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
  const ratingValue = ratingRaw != null && (trail.review_count || 0) > 0 ? ratingRaw : null;
  const ratingDisplay = ratingValue ?? 5;
  const ratingCount = trail.review_count || 0;

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
      ? [
          {
            label: 'Cancel request',
            onSelect: () => trail.onCancelRequest?.(),
            tone: 'danger' as const,
          },
        ]
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
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-green-500 dark:border-slate-800 dark:bg-slate-900"
      aria-label={trail.name}
    >
      <Link
        href={detailsHref}
        onClick={() => trail.onBeforeNavigate?.()}
        aria-label={`View details for ${trail.name}`}
        className="absolute inset-0 z-10 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <span className="sr-only">View details</span>
      </Link>

      <div className="relative p-4 pb-0">
        {primaryImage ? (
          <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
            <Image
              src={primaryImage}
              alt={trail.name}
              fill
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.015]"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              quality={90}
              loading="lazy"
            />
          </div>
        ) : (
          <TrailImagePlaceholder className="h-52 w-full rounded-2xl" />
        )}

        <div className="pointer-events-none absolute inset-x-4 top-4 h-52 rounded-2xl bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <div className="absolute left-7 top-7 z-20 flex flex-wrap items-center gap-2">
          {trail.sport_type && (
            <span className="rounded-full border border-white/40 bg-white/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-md">
              {getSportLabel(trail.sport_type)}
            </span>
          )}
          {trail.is_hazardous && (
            <span className="rounded-full border border-rose-200/60 bg-rose-600/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white">
              Hazard
            </span>
          )}
        </div>

        {hasActions && (
          <div className="absolute right-7 top-7 z-20">
            <ThemedDropdown
              label="More actions"
              hideCaret
              triggerContent={
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-5 w-5 fill-slate-900 dark:fill-slate-100"
                >
                  <circle cx="10" cy="4" r="2.1" />
                  <circle cx="10" cy="10" r="2.1" />
                  <circle cx="10" cy="16" r="2.1" />
                </svg>
              }
              triggerClassName="h-9 w-9 justify-center rounded-full border border-white/40 bg-white/85 px-0 py-0 text-slate-900 shadow-sm hover:bg-white dark:border-white/20 dark:bg-black/45 dark:text-white dark:hover:bg-black/40 focus-visible:ring-white/60"
              items={dropdownItems}
            />
          </div>
        )}
      </div>

      <div className="space-y-5 p-5 pt-4">
        <div>
          <h3 className="line-clamp-1 text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {trail.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
            {trail.location}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <p className={dataLabelClass}>Distance</p>
            <p className={dataValueClass}>{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</p>
          </div>
          <div>
            <p className={dataLabelClass}>Elevation</p>
            <p className={dataValueClass}>{elevationGainM != null ? `${Math.round(elevationGainM)} m` : '—'}</p>
          </div>
          <div>
            <p className={dataLabelClass}>Time</p>
            <p className={dataValueClass}>{estimatedHours != null ? `~${estimatedHours} h` : '—'}</p>
          </div>
          <div>
            <p className={dataLabelClass}>Rating</p>
            <p className={dataValueClass}>
              ★ {ratingDisplay.toFixed(1)}
              {ratingCount > 0 ? ` (${ratingCount})` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                trail.difficulty === 'easy'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : trail.difficulty === 'medium'
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
              }`}
            >
              {trail.difficulty}
            </span>
          </div>
          {images.length > 1 && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {images.length} photos
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default TrailCard;
