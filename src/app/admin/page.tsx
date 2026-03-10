'use client';

import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { getSportLabel } from '@/services/constants/sports';
import { getSafetyLabelText } from '@/lib/trail-safety';
import {
  fetchAdminPendingTrails,
  fetchAdminTrailRequests,
  moderateAdminTrail,
  type PendingTrail,
  type TrailInterestRequest,
} from '@/services/admin/admin.service';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [trailModerationMessage, setTrailModerationMessage] = useState<string | null>(null);
  const [trailRequestMessage] = useState<string | null>(null);

  const {
    data: pendingTrails = [],
    isLoading: loadingPendingTrails,
  } = useQuery<PendingTrail[]>({
    queryKey: QUERY_KEYS.admin.pendingTrails,
    queryFn: () => fetchAdminPendingTrails(),
  });

  const {
    data: trailRequests = [],
    isLoading: loadingTrailRequests,
  } = useQuery<TrailInterestRequest[]>({
    queryKey: QUERY_KEYS.admin.trailRequests,
    queryFn: () => fetchAdminTrailRequests(),
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
      await queryClient.invalidateQueries({ queryKey: ['admin', 'pending-trails'] });
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
      // message is handled via mutation onError
    }
  };

  return (
    <div className="space-y-10">
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Console</h1>
            <p className="text-sm text-gray-600">
              Review trail requests and publish new events.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Participant Trail Requests
        </h2>
        <p className="text-sm text-gray-600 mb-5">
          Requests submitted by participants to notify experts/admin.
        </p>
        {trailRequestMessage && (
          <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
            {trailRequestMessage}
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
                  Requested by {request.requester_name || 'Participant'} ({request.requester_email})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Preferred expert: {request.assigned_expert_name || 'N/A'} ({request.assigned_expert_email || 'N/A'})
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
                      {trail.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{trail.location}</p>
                  <p className="text-xs text-gray-500">
                    Submitted by{' '}
                    <span className="font-semibold text-gray-700">
                      {(trail.submitted_by_name || '').trim() || 'LocalMTBGroup'}
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
                    onClick={() => router.push(`/trails/create?trailId=${trail.id}`)}
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

      {/* <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Create New Event
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Publish events on behalf of experts or the platform.
        </p>
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approved expert host
            </label>
            <select
              value={eventForm.host_user_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value || undefined;
                const expert = experts.find((item) => item.id === selectedId);
                setEventForm((prev) => ({
                  ...prev,
                  host_user_id: selectedId,
                  organizer_name: expert?.name || '',
                  organizer_email: expert?.email || '',
                  sport_type:
                    Array.isArray(expert?.sports) && expert?.sports?.length
                      ? (expert.sports[0] as SportType)
                      : prev.sport_type,
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select an approved expert</option>
              {experts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name || 'Expert'} ({expert.email})
                </option>
              ))}
            </select>
            {selectedExpert && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {selectedExpert.city && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                    {selectedExpert.city}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                    selectedExpert.is_verified_expert
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {selectedExpert.is_verified_expert
                    ? 'Verified Expert'
                    : 'Not verified'}
                </span>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={eventForm.title}
              onChange={(e) => handleEventChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event date
            </label>
            <input
              type="datetime-local"
              value={eventForm.event_date}
              onChange={(e) => handleEventChange('event_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required expertise
            </label>
            <select
              value={eventForm.required_expertise}
              onChange={(e) => handleEventChange('required_expertise', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {expertiseOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sport type
            </label>
            <select
              value={eventForm.sport_type}
              onChange={(e) => handleEventChange('sport_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {(expertSports.length > 0
                ? sportOptions.filter((sport) =>
                    expertSports.includes(sport.value)
                  )
                : sportOptions
              ).map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              value={eventForm.difficulty || 'easy'}
              onChange={(e) => handleEventChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {difficultyOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={eventForm.city || ''}
              onChange={(e) => handleEventChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (NPR)
            </label>
            <input
              type="number"
              min={0}
              value={eventForm.price_npr || 0}
              onChange={(e) => handleEventChange('price_npr', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max participants
            </label>
            <input
              type="number"
              min={1}
              value={eventForm.max_participants || 20}
              onChange={(e) => handleEventChange('max_participants', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organizer name
            </label>
            <input
              type="text"
              value={eventForm.organizer_name || ''}
              onChange={(e) => handleEventChange('organizer_name', e.target.value)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organizer email
            </label>
            <input
              type="email"
              value={eventForm.organizer_email || ''}
              onChange={(e) => handleEventChange('organizer_email', e.target.value)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting point
            </label>
            <input
              type="text"
              value={eventForm.meeting_point || ''}
              onChange={(e) => handleEventChange('meeting_point', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={eventForm.description || ''}
              onChange={(e) => handleEventChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[120px]"
            />
          </div>

          {eventMessage && (
            <p className="md:col-span-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              {eventMessage}
            </p>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={eventSubmitting}
              className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {eventSubmitting ? 'Creating event...' : 'Create event'}
            </button>
          </div>
        </form>
      </section> */}
    </div>
  );
}
