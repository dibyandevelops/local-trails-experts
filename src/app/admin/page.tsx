'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchAdminTrailRequests,
  type TrailInterestRequest,
} from '@/services/admin/admin.service';

export default function AdminPage() {
  const [trailRequestMessage, setTrailRequestMessage] = useState<string | null>(null);

  const {
    data: trailRequests = [],
    isLoading: loadingTrailRequests,
  } = useQuery<TrailInterestRequest[]>({
    queryKey: QUERY_KEYS.admin.trailRequests,
    queryFn: () => fetchAdminTrailRequests(),
  });

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
