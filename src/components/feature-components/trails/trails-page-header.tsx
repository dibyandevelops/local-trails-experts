import type { FormEvent } from 'react';
import UnderlineSearchForm from '@/components/ui/underline-search-form';
import { TrailFilterChip, type TrailFilterChipTone } from './trail-filter-chip';
import { TrailViewToggle, type TrailsViewMode } from './trail-view-toggle';

export type ActiveTrailFilterChip = {
  key: string;
  label: string;
  tone: TrailFilterChipTone;
  onRemove: () => void;
};

type TrailsPageHeaderProps = {
  viewMode: TrailsViewMode;
  activeFilterCount: number;
  searchInput: string;
  activeFilters: ActiveTrailFilterChip[];
  canUploadTrails: boolean;
  onViewModeChange: (mode: TrailsViewMode) => void;
  onOpenFilters: () => void;
  onUploadTrails: () => void;
  onPlanWithGuide: () => void;
  onSearchInputChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onClearFilters: () => void;
};

export function TrailsPageHeader({
  viewMode,
  activeFilterCount,
  searchInput,
  activeFilters,
  canUploadTrails,
  onViewModeChange,
  onOpenFilters,
  onUploadTrails,
  onPlanWithGuide,
  onSearchInputChange,
  onSearch,
  onClearFilters,
}: TrailsPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 shadow-sm dark:border-emerald-800/60 dark:from-slate-950 dark:via-emerald-950/35 dark:to-lime-950/20 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Nepal Trail Guide
          </p>
          <h1 className="mt-2 text-3xl font-black text-gray-950 dark:text-slate-50 sm:text-4xl">
            Find your next trail
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
            Search mapped routes, compare distance and difficulty, then open a trail for maps,
            alerts, local guide support, and route context.
          </p>
          <button
            type="button"
            onClick={onPlanWithGuide}
            className="mt-3 text-left text-sm text-gray-600 underline decoration-emerald-500/60 underline-offset-4 transition hover:text-emerald-800 dark:text-slate-300 dark:hover:text-emerald-200"
          >
            Exploring an unfamiliar trail? Plan it with a local guide.
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TrailViewToggle value={viewMode} onChange={onViewModeChange} />
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/80 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-900/45"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {canUploadTrails && (
            <button
              type="button"
              onClick={onUploadTrails}
              className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
            >
              Upload trails
            </button>
          )}
        </div>
      </div>

      <UnderlineSearchForm
        id="trails-search"
        label="Search trails"
        placeholder="Search Pharping, Chitlang, enduro, Kathmandu..."
        value={searchInput}
        onChange={onSearchInputChange}
        onSubmit={onSearch}
        className="mt-5"
      />

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <TrailFilterChip key={filter.key} tone={filter.tone} onRemove={filter.onRemove}>
              {filter.label}
            </TrailFilterChip>
          ))}
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-white dark:border-emerald-800/60 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-emerald-950/30"
          >
            Clear all
          </button>
        </div>
      )}
    </header>
  );
}
