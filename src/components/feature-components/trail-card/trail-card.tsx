'use client'
import * as React from 'react';
import { Trail } from '@/types';
import { getSafetyLabelText } from '@/lib/trail-safety';
import { getSportLabel } from '@/services/constants/sports';

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
export const TrailCard: React.FunctionComponent<Trail> = (trail) => {
  const images = React.useMemo(() => {
    const list = [
      ...(Array.isArray(trail.trail_images) ? trail.trail_images : []),
      trail.image_url,
    ].filter((value): value is string => Boolean(value));

    if (list.length === 0) {
      return ['/tmp_pictures/Kapan-Monastery.jpg'];
    }

    return Array.from(new Set(list));
  }, [trail.trail_images, trail.image_url]);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const hasMultipleImages = images.length > 1;

  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [trail.id, images.length]);

  return (
    <Card key={trail.id} trailName={trail.name} onClick={trail.onClick}>
      <div className="relative">
        <img
          src={images[activeImageIndex]}
          alt={trail.name}
          className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
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
        <p className="mb-3 text-sm text-gray-600">{trail.location}</p>
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
      </div>
    </Card>
  );
};

export default TrailCard;
