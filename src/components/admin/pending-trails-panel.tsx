import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { getSportLabel } from '@/services/constants/sports';
import { getDifficultyLabel } from '@/services/constants/difficulty';
import { getSafetyLabelText } from '@/lib/trail-safety';
import {
  fetchAdminPendingTrails,
  moderateAdminTrail,
  type PendingTrail,
} from '@/services/admin/admin.service';

export default function PendingTrailsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [trailModerationMessage, setTrailModerationMessage] = useState<string | null>(null);

  const {
    data: pendingTrails = [],
    isLoading: loadingPendingTrails,
  } = useQuery<PendingTrail[]>({
    queryKey: QUERY_KEYS.admin.pendingTrails,
    queryFn: () => fetchAdminPendingTrails(),
  });

  const moderateTrailMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'approved' | 'rejected';
    }) => moderateAdminTrail(id, status),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.pendingTrails });
      setTrailModerationMessage(
        variables.status === 'approved'
          ? 'Trail approved and now visible for event creation.'
          : 'Trail rejected.'
      );
    },
    onError: () => {
      setTrailModerationMessage('Unable to update trail status.');
    },
  });

  const moderateTrail = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setTrailModerationMessage(null);
      await moderateTrailMutation.mutateAsync({ id, status });
    } catch (error) {
      console.error('Error moderating trail', error);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Pending Trail Approvals
      </h2>
      <p className="text-sm text-gray-600 mb-5">
        Review trails submitted by experts and approve or reject.
      </p>
      {trailModerationMessage && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {trailModerationMessage}
        </p>
      )}
      {loadingPendingTrails ? (
        <p className="text-sm text-gray-600">Loading pending trails...</p>
      ) : pendingTrails.length === 0 ? (
        <p className="text-sm text-gray-600">No pending trails.</p>
      ) : (
        <div className="space-y-3">
          {pendingTrails.map((trail) => (
            <div
              key={trail.id}
              className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{trail.name}</p>
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Pending
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {getSportLabel(trail.sport_type)}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {getDifficultyLabel(trail.difficulty)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{trail.location}</p>
                <p className="text-xs text-gray-500">
                  Submitted by{' '}
                  <span className="font-semibold text-gray-700">
                    {(trail.submitted_by_name || '').trim() || 'LocoXperts'}
                  </span>
                  {trail.submitted_by_email ? ` (${trail.submitted_by_email})` : ''}
                </p>
              </div>

              {(trail.description ||
                trail.distance_km ||
                trail.elevation_gain_m ||
                trail.estimated_time_hours ||
                (trail.safety_labels || []).length > 0 ||
                trail.image_url ||
                (trail.trail_images || []).length > 0) && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  {trail.description && (
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {trail.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                    {trail.distance_km != null && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-800">
                        {trail.distance_km} km
                      </span>
                    )}
                    {trail.elevation_gain_m != null && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 font-semibold text-purple-800">
                        +{trail.elevation_gain_m} m
                      </span>
                    )}
                    {trail.estimated_time_hours != null && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-800">
                        ~{trail.estimated_time_hours} h
                      </span>
                    )}
                    {(trail.safety_labels || []).slice(0, 4).map((label) => (
                      <span
                        key={`${trail.id}-pending-safe-${label}`}
                        className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"
                      >
                        {getSafetyLabelText(label as any)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {trail.image_url && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                        Cover image
                      </span>
                    )}
                    {(trail.trail_images || []).length > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                        {trail.trail_images?.length} photo(s)
                      </span>
                    )}
                    {Boolean(trail.route_data) && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">
                        Has GPX route
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/trails/${trail.id}`)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 text-xs font-semibold hover:bg-gray-50"
                >
                  View trail
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/upload?trailId=${trail.id}`)}
                  className="px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-800 text-xs font-semibold hover:bg-sky-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => moderateTrail(trail.id, 'approved')}
                  className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => moderateTrail(trail.id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
