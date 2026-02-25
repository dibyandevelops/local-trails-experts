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
  const Component = isClickable ? 'button' : 'div';
  return (
    <Component
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
    </Component>
  );
};
export const TrailCard: React.FunctionComponent<Trail> = (trail) => {
  return (
    <Card key={trail.id} trailName={trail.name} onClick={trail.onClick}>
      <img
        src={trail.image_url ?? '/tmp_pictures/Kapan-Monastery.jpg'}
        alt={trail.name}
        className="w-full h-48 object-cover"
      />
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
