import Link from 'next/link';
import {
  getTrailAttributionChipClass,
  getTrailAttributionLabel,
} from '@/lib/trail-attribution';
import type { OrganizationTrailRelation } from './hooks/use-organization-detail';

export default function OrganizationTrailsSection({
  trails,
}: {
  trails: OrganizationTrailRelation[];
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trail Contributions
        </h2>
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {trails.length}
        </span>
      </div>
      {trails.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">No trails linked yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {trails.map((trail) => (
            <article
              key={`${trail.trail_id}-${trail.relation_type}`}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <p
                className={`inline-flex max-w-[220px] items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getTrailAttributionChipClass(trail.relation_type)}`}
                title={`${getTrailAttributionLabel(trail.relation_type)}: ${trail.trail_name}`}
              >
                <span className="truncate">{getTrailAttributionLabel(trail.relation_type)}</span>
              </p>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {trail.trail_name}
              </h3>
              {trail.trail_location && (
                <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                  {trail.trail_location}
                </p>
              )}
              <Link
                href={`/trails/${trail.trail_slug || trail.trail_id}`}
                className="mt-3 inline-flex rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                View trail
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
