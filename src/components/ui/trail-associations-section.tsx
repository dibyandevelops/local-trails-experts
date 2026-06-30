import type { ReactNode } from 'react';
import Link from 'next/link';

export type TrailAssociationSummaryItem = {
  id: string;
  name: string;
  href?: string;
};

type TrailAssociationsSectionProps = {
  id?: string;
  title: ReactNode;
  description: ReactNode;
  trails: TrailAssociationSummaryItem[];
  emptyText: ReactNode;
  maxSummaryItems?: number;
  summaryLabel?: (remainingCount: number) => ReactNode;
  aside?: ReactNode;
  controls?: ReactNode;
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function TrailAssociationsSection({
  id,
  title,
  description,
  trails,
  emptyText,
  maxSummaryItems = 6,
  summaryLabel = (remainingCount) => `+${remainingCount} more`,
  aside,
  controls,
  message,
  children,
  className = '',
}: TrailAssociationsSectionProps) {
  const visibleTrails = trails.slice(0, maxSummaryItems);
  const remainingCount = Math.max(0, trails.length - visibleTrails.length);

  return (
    <section id={id} className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleTrails.length > 0 ? (
              visibleTrails.map((trail) =>
                trail.href ? (
                  <Link
                    key={`associated-summary-${trail.id}`}
                    href={trail.href}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100"
                  >
                    {trail.name}
                  </Link>
                ) : (
                  <span
                    key={`associated-summary-${trail.id}`}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100"
                  >
                    {trail.name}
                  </span>
                )
              )
            ) : (
              <span className="text-sm text-gray-500 dark:text-slate-400">{emptyText}</span>
            )}
            {remainingCount > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {summaryLabel(remainingCount)}
              </span>
            )}
          </div>
        </div>
        {aside ? <div className="flex flex-col items-start gap-2 md:items-end">{aside}</div> : null}
      </div>

      {controls ? <div className="mt-5">{controls}</div> : null}
      {children}
      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100">
          {message}
        </div>
      ) : null}
    </section>
  );
}
