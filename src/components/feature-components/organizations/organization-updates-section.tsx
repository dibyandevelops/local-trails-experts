import Link from 'next/link';
import type { OrganizationTrailUpdate } from './hooks/use-organization-detail';

const updateLabels: Record<OrganizationTrailUpdate['update_type'], string> = {
  condition_update: 'Condition',
  maintenance_done: 'Maintenance',
  hazard_reported: 'Hazard',
  hazard_cleared: 'Cleared',
  route_changed: 'Route changed',
  metadata_updated: 'Trail info',
};

export default function OrganizationUpdatesSection({
  updates,
}: {
  updates: OrganizationTrailUpdate[];
}) {
  if (updates.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trail Updates</h2>
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {updates.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {updates.map((update) => (
          <article
            key={update.id}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200">
                {updateLabels[update.update_type]}
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {new Date(update.created_at).toLocaleDateString()}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              {update.title}
            </h3>
            {update.details && (
              <p className="mt-1 text-xs leading-5 text-gray-700 dark:text-slate-300">
                {update.details}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
              <Link
                href={`/trails/${update.trail_slug || update.trail_id}`}
                className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                {update.trail_name}
              </Link>
              {update.actor_name && <span>by {update.actor_name}</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
