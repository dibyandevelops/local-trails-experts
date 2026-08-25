import type { TrailsViewMode } from './trail-view-toggle';

type TrailsPageSkeletonProps = {
  viewMode?: TrailsViewMode;
};

function TrailsTableSkeleton({ rows = 8, showHeader = true }: { rows?: number; showHeader?: boolean }) {
  const tableGridClass =
    'grid grid-cols-[minmax(0,1fr)_104px] md:grid-cols-[44px_minmax(0,1.45fr)_118px_190px_minmax(0,1fr)_152px]';

  return (
    <div
      className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-emerald-900/45 dark:bg-slate-950/70"
      aria-hidden="true"
    >
      {showHeader && (
        <div className={`${tableGridClass} gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-slate-900/70`}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`trail-quick-header-skeleton-${index}`}
              className="hidden h-3 rounded bg-gray-200 dark:bg-slate-800 md:block"
            />
          ))}
          <div className="h-3 rounded bg-gray-200 dark:bg-slate-800 md:hidden" />
          <div className="h-3 rounded bg-gray-200 dark:bg-slate-800 md:hidden" />
        </div>
      )}
      <div className="animate-pulse">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={`trail-table-skeleton-${index}`}
            className={`${tableGridClass} gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-slate-800 md:items-center`}
          >
            <div className="hidden h-5 rounded bg-gray-200 dark:bg-slate-800 md:block" />
            <div className="min-w-0">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="hidden h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800 md:block" />
            <div className="hidden grid-cols-2 gap-2 md:grid">
              <div className="h-4 rounded bg-gray-200 dark:bg-slate-800" />
              <div className="h-4 rounded bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="hidden gap-1.5 md:flex">
              <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="flex justify-end gap-1.5">
              <div className="h-6 w-10 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-12 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrailsPageSkeleton({ viewMode = 'grid' }: TrailsPageSkeletonProps) {
  if (viewMode === 'quick') {
    return <TrailsTableSkeleton />;
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`trail-skeleton-${index}`}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-48 w-full bg-gray-200 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-3 h-5 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-full rounded-xl bg-gray-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrailsLoadMoreSkeleton({ viewMode = 'grid' }: TrailsPageSkeletonProps) {
  if (viewMode === 'quick') {
    return (
      <div className="mt-4">
        <TrailsTableSkeleton rows={4} showHeader={false} />
      </div>
    );
  }

  return (
    <div
      className="mt-4 grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`trail-loadmore-skeleton-${index}`}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-48 w-full bg-gray-200 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-3 h-5 w-3/4 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-full rounded-xl bg-gray-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
