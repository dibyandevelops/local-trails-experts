import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchAdminTrailRequests,
  type TrailInterestRequest,
} from '@/services/admin/admin.service';

export default function TrailRequestsPanel() {
  const {
    data: trailRequests = [],
    isLoading: loadingTrailRequests,
  } = useQuery<TrailInterestRequest[]>({
    queryKey: QUERY_KEYS.admin.trailRequests,
    queryFn: () => fetchAdminTrailRequests(),
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Participant Trail Requests
      </h2>
      <p className="text-sm text-gray-600 mb-5">
        Requests submitted by participants to notify experts/admin.
      </p>
      {loadingTrailRequests ? (
        <p className="text-sm text-gray-600">Loading trail requests...</p>
      ) : trailRequests.length === 0 ? (
        <p className="text-sm text-gray-600">No trail requests yet.</p>
      ) : (
        <div className="space-y-3">
          {trailRequests.map((request) => (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <p className="text-sm font-semibold text-gray-900">
                {request.trail_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {request.trail_sport_type || 'N/A'}
                {request.trail_location ? ` • ${request.trail_location}` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Requested by {request.requester_name || 'Participant'} (
                {request.requester_email})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Preferred expert: {request.assigned_expert_name || 'N/A'} (
                {request.assigned_expert_email || 'N/A'})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Preferred date: {request.preferred_date || 'N/A'}
              </p>
              {request.description && (
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                  {request.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
