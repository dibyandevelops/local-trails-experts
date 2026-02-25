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
      className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow text-left"
      {...{
        ...(isClickable
          ? // added accessibility enhancements for clickable card
            {
              role: 'button',
              tabIndex: 0,
              onKeyDown: (event) => event.key === 'Enter' && onClick(),
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
          className="w-full h-48 object-cover"
        />
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={(event) => {
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
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900">{trail.name}</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              trail.difficulty === 'easy'
                ? 'bg-green-100 text-green-800'
                : trail.difficulty === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {trail.difficulty}
          </span>
        </div>
        <p className="text-gray-600 mb-4">{trail.location}</p>
        {trail.sport_type && (
          <p className="text-xs font-medium text-gray-500 mb-3">
            {getSportLabel(trail.sport_type)}
          </p>
        )}
        {trail.description && (
          <p className="text-gray-700 mb-4 line-clamp-3">{trail.description}</p>
        )}
        {!!trail.safety_labels?.length && (
          <div className="mb-4 flex flex-wrap gap-2">
            {trail.safety_labels.slice(0, 3).map((label) => (
              <span
                key={`${trail.id}-${label}`}
                className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
              >
                {getSafetyLabelText(label)}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          {trail.distance_km && (
            <div>
              <span className="font-semibold">Distance:</span>{' '}
              {trail.distance_km} km
            </div>
          )}
          {trail.elevation_gain_m && (
            <div>
              <span className="font-semibold">Elevation:</span>{' '}
              {trail.elevation_gain_m} m
            </div>
          )}
          {trail.estimated_time_hours && (
            <div>
              <span className="font-semibold">Time:</span>{' '}
              {trail.estimated_time_hours} hrs
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TrailCard;
