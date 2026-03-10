'use client'
import * as React from 'react';
import { Trail } from '@/types';
import { getSafetyLabelText } from '@/lib/trail-safety';
import { getSportLabel } from '@/services/constants/sports';
import TrailImagePlaceholder from '@/components/ui/trail-image-placeholder';

const Card = ({
  children,
  onClick,
  trailName,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  trailName?: string;
}) => {
  const isClickable = !!onClick;
  return (
    <div
      className="group bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 text-left hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-green-400"
      {...{
        ...(isClickable
          ? // added accessibility enhancements for clickable card
            {
              role: 'button',
              tabIndex: 0,
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onClick();
                }
              },
              onClick,
              'aria-label': `Select ${trailName}`,
            }
          : {}),
      }}
    >
      {children}
    </div>
  );
};
export type TrailCardProps = Trail & {
  hideLoading?: boolean;
  unhideLoading?: boolean;
  deleteLoading?: boolean;
  editLoading?: boolean;
  onEdit?: () => void;
};

export const TrailCard: React.FunctionComponent<TrailCardProps> = (trail) => {
  const images = React.useMemo(() => {
    const list = [
      ...(Array.isArray(trail.trail_images) ? trail.trail_images : []),
      trail.image_url,
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(list));
  }, [trail.trail_images, trail.image_url]);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const hasMultipleImages = images.length > 1;
  const hasImage = images.length > 0;

  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [trail.id, images.length]);

  return (
    <Card key={trail.id} trailName={trail.name} onClick={trail.onClick}>
      <div className="relative">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[activeImageIndex]}
            alt={trail.name}
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <TrailImagePlaceholder className="h-40 w-full" label="Local Guides" />
        )}
        {trail.onViewMap && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              trail.onViewMap?.();
            }}
            className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/70"
            aria-label={`View map for ${trail.name}`}
            title="Open this trail route in a quick map modal"
          >
            Map
          </button>
        )}
        {hasMultipleImages && (
          <>
            <button
              type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveImageIndex((prev) =>
                      prev === 0 ? images.length - 1 : prev - 1
                );
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-xs text-white"
              aria-label="Previous trail image"
            >
              ‹
            </button>
            <button
              type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveImageIndex((prev) =>
                      prev === images.length - 1 ? 0 : prev + 1
                    );
                  }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-2 py-1 text-xs text-white"
              aria-label="Next trail image"
            >
              ›
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {images.map((_, index) => (
                <button
                  key={`${trail.id}-image-dot-${index}`}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveImageIndex(index);
                  }}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`Show trail image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">{trail.name}</h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              trail.difficulty === 'easy'
                ? 'bg-green-100 text-green-800'
                : trail.difficulty === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
            title="Trail difficulty level"
          >
            {trail.difficulty}
          </span>
        </div>
        <p className="mb-2 text-sm text-gray-600">{trail.location}</p>

        {(trail.created_by || trail.expert_name) && (
          <p className="mb-3 text-xs font-medium text-blue-600">
            Created by: {trail.expert_name || trail.created_by}
          </p>
        )}

        {trail.sport_type && (
          <p className="mb-2 text-xs font-medium text-gray-500">
            {getSportLabel(trail.sport_type)}
          </p>
        )}
        {trail.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-700">{trail.description}</p>
        )}
        {!!trail.safety_labels?.length && (
          <div className="mb-3 flex flex-wrap gap-2">
            {trail.safety_labels.slice(0, 3).map((label) => (
              <span
                key={`${trail.id}-${label}`}
                className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                title="Safety label"
              >
                {getSafetyLabelText(label)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {trail.distance_km && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
              <span title="Total distance">{trail.distance_km} km</span>
            </span>
          )}
          {trail.elevation_gain_m && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
              <span title="Total elevation gain">+{trail.elevation_gain_m} m</span>
            </span>
          )}
          {trail.estimated_time_hours && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
              <span title="Estimated completion time">~{trail.estimated_time_hours} h</span>
            </span>
          )}
        </div>
        {(trail.onViewMap || trail.onRequestTrail || trail.onCreateEvent) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {trail.onCreateEvent && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
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
                  event.stopPropagation();
                  trail.onViewMap?.();
                }}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                title="Open this trail in map modal"
              >
                View Map
              </button>
            )}
            {trail.onRequestTrail && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  trail.onRequestTrail?.();
                }}
                className="rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 hover:bg-green-100"
                title="Request this trail activity with preferred expert/date"
              >
                Request Trail
              </button>
            )}
          </div>
        )}

        {/* Admin delete/hide buttons */}
        {(trail.onDelete || trail.onHide || trail.onUnhide || trail.onEdit) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 border-gray-200">
            {/* Hidden badge indicator */}
            {trail.is_hidden && (
              <span className="rounded-full bg-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600">
                Hidden
              </span>
            )}
            {trail.onEdit && (
              <button
                type="button"
                disabled={trail.deleteLoading || trail.hideLoading || trail.unhideLoading || trail.editLoading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
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
                disabled={trail.unhideLoading || trail.deleteLoading || trail.hideLoading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
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
                disabled={trail.hideLoading || trail.deleteLoading || trail.unhideLoading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
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
                disabled={trail.deleteLoading || trail.hideLoading || trail.unhideLoading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (confirm('Are you sure you want to delete this trail? This action cannot be undone.')) {
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
        )}
      </div>
    </Card>
  );
};

export default TrailCard;
