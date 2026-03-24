import type { SportType } from '@/types';

export const SPORT_OPTIONS: Array<{ value: SportType; label: string }> = [
  { value: 'mtb', label: 'Mountain Biking Trails' },
  { value: 'downhill_mtb', label: 'Downhill MTB Trails' },
  { value: 'enduro_mtb', label: 'Enduro MTB Trails' },
  { value: 'devotion_trail', label: 'Devotion Trails (Temple Loop)' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'trail_running', label: 'Trail Running' },
  { value: 'local_tour', label: 'Local Tours' },
  { value: 'road_cycling', label: 'Road Cycling' },
  { value: 'xc_trails', label: 'XC Trails' },
  { value: 'gravel_rides', label: 'Gravel Rides' },
  { value: 'training', label: 'Training & Coaching' },
];

export const TRAIL_SPORTS: Array<{ value: SportType; label: string }> = [
  { value: 'mtb', label: 'Mountain Biking Trails' },
  { value: 'downhill_mtb', label: 'Downhill MTB Trails' },
  { value: 'enduro_mtb', label: 'Enduro MTB Trails' },
  { value: 'trail_running', label: 'Trail Running' },
  { value: 'devotion_trail', label: 'Devotion Trails (Temple Loop)' },
  // { value: 'hiking', label: 'Hiking' },
  // { value: 'local_tour', label: 'Local Tours' },
  { value: 'road_cycling', label: 'Road Cycling' },
  { value: 'xc_trails', label: 'XC Trails' },
  { value: 'gravel_rides', label: 'Gravel Rides' },
];

export const DEFAULT_TRAIL_SPORT: SportType = 'mtb';

const LABEL_MAP = new Map(SPORT_OPTIONS.map((item) => [item.value, item.label]));

export function getSportLabel(value: string | null | undefined) {
  if (!value) return '';
  return LABEL_MAP.get(value as SportType) || value;
}
