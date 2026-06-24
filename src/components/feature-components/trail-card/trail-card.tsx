'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Bike,
  CircleDollarSign,
  CircleDot,
  Footprints,
  Hammer,
  MapPinned,
  Mountain,
  PersonStanding,
  Route,
  Shield,
} from 'lucide-react';
import { Trail } from '@/types';
import { getKomootNavigateUrl } from '@/lib/komoot';
import { getSportLabel } from '@/services/constants/sports';
import { getDifficultyLabel, normalizeDifficulty } from '@/services/constants/difficulty';
import TrailImagePlaceholder from '@/components/ui/trail-image-placeholder';
import ThemedDropdown from '@/components/ui/themed-dropdown';
import { getTrailAttributionChipClass, getTrailAttributionLabel } from '@/lib/trail-attribution';

export type TrailCardProps = Trail & {
  detailsHref?: string;
  showViewTrailOption?: boolean;
  onBeforeNavigate?: () => void;
  onOpenImageGallery?: () => void;
  hideLoading?: boolean;
  unhideLoading?: boolean;
  deleteLoading?: boolean;
  editLoading?: boolean;
  onEdit?: () => void;
  isRequested?: boolean;
  onRequestTrail?: () => void;
  onCancelRequest?: () => void;
  isAssociatedToExpert?: boolean;
  associationLoading?: boolean;
  onAssociateTrail?: () => void;
  onRemoveAssociation?: () => void;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const dataLabelClass =
  'text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400';
const dataValueClass = 'mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100';

const getSportIconNode = (sportType: string | null | undefined) => {
  const commonProps = { className: 'h-3 w-3', strokeWidth: 2.2, 'aria-hidden': true as const };
  switch (sportType) {
    case 'hiking':
      return <PersonStanding {...commonProps} />;
    case 'trail_running':
      return <Footprints {...commonProps} />;
    case 'local_tour':
      return <MapPinned {...commonProps} />;
    case 'road_cycling':
    case 'gravel_rides':
      return <Route {...commonProps} />;
    case 'xc_trails':
      return <CircleDot {...commonProps} />;
    case 'devotion_trail_rides':
      return <Mountain {...commonProps} />;
    case 'downhill_mtb':
    case 'enduro_mtb':
    case 'mtb':
      return <Bike {...commonProps} />;
    default:
      return <Shield {...commonProps} />;
  }
};

export const TrailCard: React.FunctionComponent<TrailCardProps> = (trail) => {
  const detailsHref = trail.detailsHref || `/trails/${trail.slug || trail.id}`;
  const difficulty = normalizeDifficulty(trail.difficulty);
  const [shareState, setShareState] = React.useState<'idle' | 'copied' | 'error'>('idle');

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
  const hasTrailBuilder =
    Boolean(trail.built_by_org_name || trail.maintained_by_org_name || trail.verified_by_org_name) ||
    (trail.trail_builder_count || 0) > 0;
  const primaryTrailBuilder = trail.built_by_org_name
    ? { relation: 'built_by' as const, name: trail.built_by_org_name }
    : trail.maintained_by_org_name
      ? { relation: 'maintained_by' as const, name: trail.maintained_by_org_name }
      : trail.verified_by_org_name
        ? { relation: 'verified_by' as const, name: trail.verified_by_org_name }
        : null;

  const dropdownItems = [
    ...(trail.showViewTrailOption ? [{ label: 'View trail', href: detailsHref }] : []),
    ...(trail.onCreateEvent
      ? [{ label: 'Create event', onSelect: () => trail.onCreateEvent?.() }]
      : []),
    ...(trail.onViewMap ? [{ label: 'View map', onSelect: () => trail.onViewMap?.() }] : []),
    ...(images.length > 0 && trail.onOpenImageGallery
      ? [{ label: 'View photos', onSelect: () => trail.onOpenImageGallery?.() }]
      : []),
    ...(komootNavigateUrl ? [{ label: 'Navigate', href: komootNavigateUrl }] : []),
    ...(trail.onRequestTrail && !trail.isRequested
      ? [{ label: 'Plan this ride', onSelect: () => trail.onRequestTrail?.() }]
      : []),
    ...(trail.onCancelRequest && trail.isRequested
      ? [
          {
            label: 'Cancel request',
            onSelect: () => trail.onCancelRequest?.(),
            tone: 'danger' as const,
          },
        ]
      : []),
    ...(trail.onAssociateTrail && !trail.isAssociatedToExpert
      ? [
          {
            label: trail.associationLoading ? 'Pinning...' : 'Pin to my expert profile',
            disabled: trail.associationLoading,
            onSelect: () => trail.onAssociateTrail?.(),
          },
        ]
      : []),
    ...(trail.onRemoveAssociation && trail.isAssociatedToExpert
      ? [
          {
            label: trail.associationLoading ? 'Removing...' : 'Remove from my expert profile',
            disabled: trail.associationLoading,
            onSelect: () => trail.onRemoveAssociation?.(),
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

  const copyToClipboard = React.useCallback(async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  }, []);

  const handleShare = React.useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === 'undefined') return;
    const shareUrl = detailsHref.startsWith('http')
      ? detailsHref
      : `${window.location.origin}${detailsHref}`;
    const shareData = {
      title: trail.name,
      text: `Check out this trail: ${trail.name}`,
      url: shareUrl,
    };

    try {
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        setShareState('copied');
        window.setTimeout(() => setShareState('idle'), 1500);
        return;
      }
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      setShareState('error');
      window.setTimeout(() => setShareState('idle'), 1500);
    } catch {
      setShareState('error');
      window.setTimeout(() => setShareState('idle'), 1500);
    }
  }, [copyToClipboard, detailsHref, trail.name]);

  return (
    <article
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-green-500 dark:border-emerald-900/45 dark:bg-gradient-to-br dark:from-slate-950 dark:via-emerald-950/15 dark:to-slate-900 dark:hover:border-emerald-700/70"
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
          <div className="relative h-52 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950">
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
            <span
              className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white backdrop-blur-md"
              title={getSportLabel(trail.sport_type)}
            >
              {getSportIconNode(trail.sport_type)}
              <span className="line-clamp-1">{getSportLabel(trail.sport_type)}</span>
            </span>
          )}
          {trail.is_hazardous && (
            <span className="rounded-full border border-rose-200/60 bg-rose-600/90 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white">
              Hazard
            </span>
          )}
        </div>

        <div className="absolute right-7 top-7 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/85 text-slate-900 shadow-sm transition hover:bg-white dark:border-white/20 dark:bg-black/45 dark:text-white dark:hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Share trail"
            title={shareState === 'copied' ? 'Link copied' : shareState === 'error' ? 'Unable to share' : 'Share'}
          >
            {shareState === 'copied' ? (
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current text-emerald-600">
                <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0L3.3 9.1a1 1 0 1 1 1.4-1.4l4.1 4.1 6.5-6.5a1 1 0 0 1 1.4 0Z" />
              </svg>
            ) : shareState === 'error' ? (
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current text-rose-600">
                <path d="M10 1.5A8.5 8.5 0 1 0 10 18.5 8.5 8.5 0 0 0 10 1.5Zm3.2 10.3a1 1 0 1 1-1.4 1.4L10 11.4l-1.8 1.8a1 1 0 0 1-1.4-1.4L8.6 10 6.8 8.2a1 1 0 1 1 1.4-1.4L10 8.6l1.8-1.8a1 1 0 1 1 1.4 1.4L11.4 10l1.8 1.8Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d="M14 3a3 3 0 0 0-2.76 4.17L7.9 9.1a3 3 0 1 0 .27 1.9l3.1 1.56a3 3 0 1 0 .7-1.43l-3.2-1.6a2.98 2.98 0 0 0-.14-.63l3.38-1.9A3 3 0 1 0 14 3Z" />
              </svg>
            )}
          </button>
          {hasActions && (
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
          )}
        </div>
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
                difficulty === 'novice'
                  ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
                  : difficulty === 'easy'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : difficulty === 'moderate'
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
                  : difficulty === 'expert'
                  ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/40 dark:text-fuchsia-200'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
              }`}
            >
              {getDifficultyLabel(trail.difficulty)}
            </span>
            {primaryTrailBuilder ? (
              <span
                className={`inline-flex max-w-[240px] items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getTrailAttributionChipClass(primaryTrailBuilder.relation)}`}
                title={`${getTrailAttributionLabel(primaryTrailBuilder.relation)}: ${primaryTrailBuilder.name}`}
              >
                <Hammer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {getTrailAttributionLabel(primaryTrailBuilder.relation)}: {primaryTrailBuilder.name}
                </span>
              </span>
            ) : hasTrailBuilder ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                title={`${trail.trail_builder_count || 1} trail builder${trail.trail_builder_count === 1 ? '' : 's'}`}
              >
                <Hammer className="h-3.5 w-3.5" aria-hidden="true" />
                Trail builder
              </span>
            ) : null}
            {(trail.associated_expert_count || 0) > 0 && (
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200">
                Expert
              </span>
            )}
            {(trail.campaign_count || 0) > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                title={`${trail.campaign_count} active campaign${trail.campaign_count === 1 ? '' : 's'}`}
              >
                <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                Campaign
              </span>
            )}
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
