import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppDialog from '@/components/ui/app-dialog';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { getSportLabel } from '@/services/constants/sports';
import {
  fetchAdminExpertTrails,
  updateAdminExpertTrails,
  type AdminExpertTrail,
  type AdminUser,
} from '@/services/admin/admin.service';
import type { SportType } from '@/types';

type ExpertTrailsManagerModalProps = {
  expert: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function sortTrailsByAppliedSelection(trails: AdminExpertTrail[], appliedIds: string[]) {
  const appliedOrder = new Map(appliedIds.map((id, index) => [id, index]));
  return [...trails].sort((a, b) => {
    const aApplied = appliedOrder.has(a.id);
    const bApplied = appliedOrder.has(b.id);
    if (aApplied && bApplied) {
      return (appliedOrder.get(a.id) ?? 0) - (appliedOrder.get(b.id) ?? 0);
    }
    if (aApplied) return -1;
    if (bApplied) return 1;
    return a.name.localeCompare(b.name);
  });
}

export default function ExpertTrailsManagerModal({
  expert,
  open,
  onOpenChange,
}: ExpertTrailsManagerModalProps) {
  const queryClient = useQueryClient();
  const [selectedTrailIds, setSelectedTrailIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const expertId = expert?.id || null;

  const { data, isFetching, error } = useQuery({
    queryKey: QUERY_KEYS.admin.expertTrails(expertId),
    queryFn: () => fetchAdminExpertTrails(expertId || ''),
    enabled: open && Boolean(expertId),
  });

  useEffect(() => {
    if (!open || !data) return;
    setSelectedTrailIds(data.associated_trails.map((trail) => trail.id));
    setNotice(null);
  }, [data, open]);

  const appliedTrailIds = useMemo(
    () => (data?.associated_trails || []).map((trail) => trail.id),
    [data?.associated_trails]
  );

  const sortedAvailableTrails = useMemo(
    () => sortTrailsByAppliedSelection(data?.available_trails || [], appliedTrailIds),
    [appliedTrailIds, data?.available_trails]
  );

  const selectedTrails = useMemo(() => {
    const trailById = new Map((data?.available_trails || []).map((trail) => [trail.id, trail]));
    return selectedTrailIds
      .map((trailId) => trailById.get(trailId))
      .filter((trail): trail is AdminExpertTrail => Boolean(trail));
  }, [data?.available_trails, selectedTrailIds]);

  const updateMutation = useMutation({
    mutationFn: () => updateAdminExpertTrails(expertId || '', selectedTrailIds),
    onSuccess: async (associatedTrails) => {
      setNotice('Associated trails updated.');
      setSelectedTrailIds(associatedTrails.map((trail) => trail.id));
      queryClient.setQueryData(
        QUERY_KEYS.admin.expertTrails(expertId),
        data
          ? {
              ...data,
              associated_trails: associatedTrails,
            }
          : data
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.expertTrails(expertId) }),
        queryClient.invalidateQueries({ queryKey: ['experts'] }),
      ]);
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setNotice(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update associated trails.'
      );
    },
  });

  const toggleTrail = (trailId: string) => {
    setNotice(null);
    setSelectedTrailIds((current) => {
      if (current.includes(trailId)) {
        return current.filter((id) => id !== trailId);
      }
      if (current.length >= 12) {
        setNotice('An expert can be associated with up to 12 trails.');
        return current;
      }
      return [...current, trailId];
    });
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setNotice(null);
      }}
      title="Manage expert trails"
      description={expert ? `Associate trails for ${expert.name || expert.email}.` : undefined}
      maxWidthClassName="max-w-4xl"
    >
      <div className="mt-4 space-y-4">
        {notice && (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
            {notice}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {error instanceof Error ? error.message : 'Failed to load expert trails.'}
          </p>
        )}

        {isFetching && !data ? (
          <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            Loading trails...
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Selected for this expert
                </p>
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                  {selectedTrailIds.length}/12 selected
                </span>
              </div>
              {selectedTrails.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTrails.map((trail) => (
                    <Link
                      key={`admin-selected-expert-trail-${trail.id}`}
                      href={`/trails/${trail.slug || trail.id}`}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-slate-800"
                    >
                      {trail.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                  No trails selected yet.
                </p>
              )}
            </div>

            {(data?.available_trails || []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                No approved visible trails are available to associate yet.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Select</th>
                      <th className="px-3 py-2">Trail</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Sport</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAvailableTrails.map((trail) => {
                      const checked = selectedTrailIds.includes(trail.id);
                      return (
                        <tr
                          key={`admin-expert-trail-${trail.id}`}
                          className="border-t border-gray-200 dark:border-slate-800"
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTrail(trail.id)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                              aria-label={`Associate ${trail.name}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Link
                              href={`/trails/${trail.slug || trail.id}`}
                              className="font-semibold text-gray-900 hover:text-green-700 dark:text-slate-100 dark:hover:text-emerald-300"
                            >
                              {trail.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                            {trail.location || '-'}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                            {trail.sport_type ? getSportLabel(trail.sport_type as SportType) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || isFetching || !expertId}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save associated trails'}
          </button>
        </div>
      </div>
    </AppDialog>
  );
}
