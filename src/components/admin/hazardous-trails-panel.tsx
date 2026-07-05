'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Trail } from '@/types';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { fetchTrails, updateTrail } from '@/services/trails/trails.service';
import DateText from '@/components/ui/date-text';

export default function HazardousTrailsPanel() {
  const queryClient = useQueryClient();

  const { data: trails = [], isLoading } = useQuery<Trail[]>({
    queryKey: QUERY_KEYS.trails.list({ hazardous: true }),
    queryFn: ({ signal }) => fetchTrails({ hazardous: true }, signal),
  });

  const clearMutation = useMutation({
    mutationFn: (trailId: string) =>
      updateTrail(trailId, { is_hazardous: false, hazard_note: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trails.list({ hazardous: true }) });
      queryClient.invalidateQueries({ queryKey: ['trails'] });
      queryClient.invalidateQueries({ queryKey: ['trails-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['trails-infinite'] });
    },
  });

  return (
    <section className="space-y-4 rounded-xl border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-900/60 dark:bg-slate-900 sm:rounded-2xl sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hazardous Trails
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Trails currently flagged as hazardous by admins or experts.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">Loading hazardous trails...</p>
      ) : trails.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">
          No hazardous trails reported right now.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="py-2 pr-4">Trail</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Hazard Note</th>
                <th className="py-2 pr-4">Updated</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {trails.map((trail) => (
                <tr key={trail.id} className="text-gray-700 dark:text-slate-200">
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {trail.name}
                    </div>
                    <Link
                      href={`/trails/${trail.id}`}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 dark:text-rose-200"
                    >
                      View trail
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{trail.location}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                      {trail.status || 'approved'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-xs text-gray-600 dark:text-slate-300">
                      {trail.hazard_note || 'No note provided.'}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      <DateText value={trail.hazard_updated_at || trail.updated_at} pattern="PPP" />
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => clearMutation.mutate(trail.id)}
                      disabled={clearMutation.isPending}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {clearMutation.isPending ? 'Updating...' : 'Clear hazard'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
