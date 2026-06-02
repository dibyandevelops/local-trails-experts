export type TrailSort =
  | 'random'
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'distance_asc'
  | 'distance_desc'
  | 'elevation_desc';

export type RideProfile = '' | 'short' | 'medium' | 'long';

export const TRAIL_SORT_OPTIONS: Array<{ value: TrailSort; label: string }> = [
  { value: 'random', label: 'Random' },
  { value: 'newest', label: 'Newest' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'distance_asc', label: 'Distance (low to high)' },
  { value: 'distance_desc', label: 'Distance (high to low)' },
  { value: 'elevation_desc', label: 'Elevation gain (high to low)' },
];

export const RIDE_PROFILE_QUICK_FILTERS: Array<{ label: string; value: RideProfile }> = [
  { label: 'All rides', value: '' },
  { label: 'Short ride', value: 'short' },
  { label: 'Medium ride', value: 'medium' },
  { label: 'Long ride', value: 'long' },
];

export function isTrailSort(value: string): value is TrailSort {
  return TRAIL_SORT_OPTIONS.some((option) => option.value === value);
}
