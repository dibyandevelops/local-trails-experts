import { SITE_NAME } from '@/lib/seo';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import { getSportLabel } from '@/services/constants/sports';

type TrailShareInput = {
  name: string;
  description?: string | null;
  location?: string | null;
  difficulty?: string | null;
  sport_type?: string | null;
  distance_km?: string | number | null;
  elevation_gain_m?: string | number | null;
  estimated_time_hours?: string | number | null;
};

function cleanText(value?: string | null) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function titleCase(value?: string | null) {
  return cleanText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function formatNumber(value?: string | number | null, fractionDigits = 0) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function formatTrailDistance(value?: string | number | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `${formatNumber(numeric, numeric < 10 ? 1 : 0)} km`;
}

export function formatTrailClimb(value?: string | number | null) {
  const formatted = formatNumber(value);
  return formatted ? `+${formatted} m` : null;
}

export function formatTrailTime(value?: string | number | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 1 })} hr`;
}

export function getTrailShareTitle(trail: TrailShareInput) {
  return `${cleanText(trail.name) || 'Trail'} — Nepal Trail Guide`;
}

export function getTrailShareDescription(trail: TrailShareInput) {
  const provided = cleanText(trail.description);
  if (provided) return provided.length > 165 ? `${provided.slice(0, 162).trim()}...` : provided;

  const facts = [
    getTrailSportLabel(trail.sport_type),
    trail.difficulty ? getDifficultyLabel(trail.difficulty) : null,
    formatTrailDistance(trail.distance_km),
    formatTrailClimb(trail.elevation_gain_m),
  ].filter(Boolean);
  const location = cleanText(trail.location);
  const factText = facts.length ? ` ${facts.join(' · ')}.` : '';
  return location
    ? `Explore ${cleanText(trail.name)} near ${location} on ${SITE_NAME}.${factText}`
    : `Explore ${cleanText(trail.name)} on ${SITE_NAME}.${factText}`;
}

export function getTrailShareStats(trail: TrailShareInput) {
  return [
    { label: 'Distance', value: formatTrailDistance(trail.distance_km) },
    { label: 'Climb', value: formatTrailClimb(trail.elevation_gain_m) },
    { label: 'Time', value: formatTrailTime(trail.estimated_time_hours) },
    { label: 'Level', value: trail.difficulty ? getDifficultyLabel(trail.difficulty) : null },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
}

export function getTrailSportLabel(value?: string | null) {
  return getSportLabel(value) || titleCase(value) || 'Trail';
}
