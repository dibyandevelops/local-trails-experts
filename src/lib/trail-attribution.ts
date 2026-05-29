export type TrailAttributionRelation = 'built_by' | 'verified_by' | 'maintained_by';

export function getTrailAttributionLabel(relation: TrailAttributionRelation) {
  if (relation === 'built_by') return 'Built';
  if (relation === 'verified_by') return 'Verified';
  return 'Maintained';
}

export function getTrailAttributionChipClass(relation: TrailAttributionRelation) {
  if (relation === 'built_by') {
    return 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200';
  }
  if (relation === 'verified_by') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200';
}

