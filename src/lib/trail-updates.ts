export type TrailUpdateType =
  | 'condition_update'
  | 'maintenance_done'
  | 'hazard_reported'
  | 'hazard_cleared'
  | 'route_changed'
  | 'metadata_updated';

export const TRAIL_UPDATE_TYPE_OPTIONS: Array<{ value: TrailUpdateType; label: string }> = [
  { value: 'condition_update', label: 'Condition update' },
  { value: 'maintenance_done', label: 'Maintenance done' },
  { value: 'hazard_reported', label: 'Hazard reported' },
  { value: 'hazard_cleared', label: 'Hazard cleared' },
  { value: 'route_changed', label: 'Route changed' },
  { value: 'metadata_updated', label: 'Metadata updated' },
];

export const trailUpdateTypeLabelByValue: Record<TrailUpdateType, string> = {
  condition_update: 'Condition update',
  maintenance_done: 'Maintenance done',
  hazard_reported: 'Hazard reported',
  hazard_cleared: 'Hazard cleared',
  route_changed: 'Route changed',
  metadata_updated: 'Metadata updated',
};

export function getTrailUpdateTypeBadgeClass(updateType: TrailUpdateType) {
  if (updateType === 'hazard_reported') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200';
  }
  if (updateType === 'hazard_cleared' || updateType === 'maintenance_done') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  if (updateType === 'route_changed') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200';
  }
  return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-200';
}
