import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchAdminTrailRequests,
  type TrailInterestRequest,
} from '@/services/admin/admin.service';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

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
      {EXPERTS_BETA_ENABLED && (
        <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Experts beta is enabled. Trail requests are currently routed to admin for scheduling.
        </p>
      )}
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
              <p className="text-xs text-gray-500 mt-1">
                Preferred time: {request.preferred_time || 'N/A'}
                {request.offered_price_npr != null ? ` • Offer: NPR ${request.offered_price_npr}` : ''}
                {request.needs_paid_shuttle ? ' • Paid shuttle requested' : ''}
              </p>
              {request.nearest_point && (
                <p className="text-xs text-gray-500 mt-1">
                  Nearest point: {request.nearest_point}
                </p>
              )}
              {request.description && (
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                  {request.description}
                </p>
              )}
              <div className="mt-3">
                <Link
                  href={`/events/create?trail_id=${encodeURIComponent(
                    request.trail_id
                  )}&sport=${encodeURIComponent(
                    request.trail_sport_type || ''
                  )}&requested_by_name=${encodeURIComponent(
                    request.requester_name || ''
                  )}&requested_by_email=${encodeURIComponent(
                    request.requester_email || ''
                  )}&requested_date=${encodeURIComponent(
                    request.preferred_date || ''
                  )}&requested_time=${encodeURIComponent(
                    request.preferred_time || ''
                  )}&requested_offer_npr=${encodeURIComponent(
                    request.offered_price_npr != null ? String(request.offered_price_npr) : ''
                  )}&requested_nearest_point=${encodeURIComponent(
                    request.nearest_point || ''
                  )}&trail_request_id=${encodeURIComponent(request.id)}`}
                  className="inline-flex items-center rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                >
                  Create event from request
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
