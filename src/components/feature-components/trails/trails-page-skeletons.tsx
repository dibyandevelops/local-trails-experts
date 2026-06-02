export function TrailsPageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`trail-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-48 w-full bg-gray-200 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-3 h-6 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-full rounded bg-gray-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrailsLoadMoreSkeleton() {
  return (
    <div
      className="mt-4 grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`trail-loadmore-skeleton-${index}`}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="h-48 w-full bg-gray-200 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-3 h-6 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-800" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-full rounded bg-gray-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
