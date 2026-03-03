'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateEventInput, Difficulty, ExpertiseLevel, SportType, User } from '@/types';
import { fetchVerifiedExperts } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchAdminExpertApplications,
  fetchAdminPendingTrails,
  fetchAdminTrailRequests,
  moderateAdminTrail,
  sendAdminVerificationRequest,
  updateAdminExpertApplicationStatus,
  type ExpertApplication,
  type PendingTrail,
  type TrailInterestRequest,
} from '@/services/admin/admin.service';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [appError, setAppError] = useState<string | null>(null);
  const [appNotice, setAppNotice] = useState<string | null>(null);
  const [verificationDrafts, setVerificationDrafts] = useState<Record<string, string>>({});
  const [sendingVerificationFor, setSendingVerificationFor] = useState<string | null>(null);
  const [trailModerationMessage, setTrailModerationMessage] = useState<string | null>(null);
  const [trailRequestMessage, setTrailRequestMessage] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState<CreateEventInput>({
    title: '',
    event_date: '',
    required_expertise: 'beginner',
    description: '',
    organizer_name: '',
    organizer_email: '',
    meeting_point: '',
    difficulty: 'easy',
    sport_type: 'mtb',
    city: '',
    price_npr: 0,
    max_participants: 20,
    host_user_id: undefined,
  });
  // const [eventSubmitting, setEventSubmitting] = useState(false);
  // const [eventMessage, setEventMessage] = useState<string | null>(null);

  const {
    data: applications = [],
    isLoading: loadingApps,
  } = useQuery<ExpertApplication[]>({
    queryKey: QUERY_KEYS.admin.expertApplications(statusFilter),
    queryFn: () => fetchAdminExpertApplications(statusFilter),
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
  });

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

  const updateApplicationMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'pending' | 'approved' | 'rejected';
    }) => updateAdminExpertApplicationStatus(id, status),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.admin.expertApplications(statusFilter),
      });
      if (data?.tempPassword) {
        setAppNotice(`Temp password for ${data.application?.email}: ${data.tempPassword}`);
      }
    },
    onError: () => {
      setAppError('Unable to update application status.');
    },
  });

  const verificationRequestMutation = useMutation({
    mutationFn: ({
      applicationId,
      message,
    }: {
      applicationId: string;
      message: string;
    }) => sendAdminVerificationRequest(applicationId, message),
    onSuccess: () => {
      setAppNotice('Verification request email sent.');
    },
    onError: () => {
      setAppError('Unable to send verification request email.');
    },
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

  const updateApplicationStatus = async (
    id: string,
    status: ExpertApplication['status']
  ) => {
    setAppError(null);
    setAppNotice(null);
    await updateApplicationMutation.mutateAsync({ id, status });
  };

  const sendVerificationRequest = async (applicationId: string) => {
    const message = (verificationDrafts[applicationId] || '').trim();
    if (!message) {
      setAppError('Please enter a message before sending verification request.');
      return;
    }

    try {
      setSendingVerificationFor(applicationId);
      setAppError(null);
      setAppNotice(null);
      await verificationRequestMutation.mutateAsync({ applicationId, message });
      setVerificationDrafts((prev) => ({ ...prev, [applicationId]: '' }));
    } catch (error) {
      console.error('Error sending verification request email', error);
      // message is handled via mutation onError
    } finally {
      setSendingVerificationFor(null);
    }
  };

  const moderateTrail = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setTrailModerationMessage(null);
      await moderateTrailMutation.mutateAsync({ id, status });
    } catch (error) {
      console.error('Error moderating trail', error);
      // message is handled via mutation onError
    }
  };

  // const handleEventChange = (field: keyof CreateEventInput, value: string | number) => {
  //   setEventForm((prev) => ({
  //     ...prev,
  //     [field]: value,
  //   }));
  // };

  const selectedExpert = eventForm.host_user_id
    ? experts.find((expert) => expert.id === eventForm.host_user_id)
    : undefined;
  const expertSports = Array.isArray(selectedExpert?.sports)
    ? selectedExpert?.sports
    : [];

  useEffect(() => {
    if (expertSports.length === 0) return;
    if (!eventForm.sport_type || !expertSports.includes(eventForm.sport_type)) {
      setEventForm((prev) => ({
        ...prev,
        sport_type: expertSports[0] as SportType,
      }));
    }
  }, [expertSports, eventForm.sport_type]);

  // const handleCreateEvent = async (event: React.FormEvent) => {
  //   event.preventDefault();
  //   setEventMessage(null);

  //   if (!eventForm.title || !eventForm.event_date || !eventForm.required_expertise) {
  //     setEventMessage('Please fill in the required fields.');
  //     return;
  //   }

  //   if (!eventForm.host_user_id) {
  //     setEventMessage('Please select an approved expert host.');
  //     return;
  //   }

  //   try {
  //     setEventSubmitting(true);
  //     const res = await fetch('/api/events', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(eventForm),
  //     });
  //     const data = await res.json();
  //     if (!res.ok) {
  //       throw new Error(data?.error || 'Failed to create event');
  //     }
  //     setEventMessage('Event created successfully.');
  //     setEventForm((prev) => ({
  //       ...prev,
  //       title: '',
  //       description: '',
  //       event_date: '',
  //       organizer_name: '',
  //       organizer_email: '',
  //       meeting_point: '',
  //       city: '',
  //       price_npr: 0,
  //       max_participants: 20,
  //       host_user_id: undefined,
  //     }));
  //   } catch (error) {
  //     console.error('Error creating event', error);
  //     setEventMessage('Unable to create event.');
  //   } finally {
  //     setEventSubmitting(false);
  //   }
  // };

  return (
    <div className="space-y-10">
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Console</h1>
            <p className="text-sm text-gray-600">
              Review expert applications and publish new events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {appError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {appError}
          </p>
        )}
        {appNotice && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
            {appNotice}
          </p>
        )}

        {loadingApps ? (
          <p className="text-sm text-gray-600">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-gray-600">No applications to review.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {app.name}
                  </h3>
                  <p className="text-xs text-gray-500">{app.email}</p>
                  {app.city && (
                    <p className="text-xs text-gray-500">City: {app.city}</p>
                  )}
                  {Array.isArray(app.sports) && app.sports.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {app.sports.map((sport) => (
                        <span
                          key={sport}
                          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium"
                        >
                          {sport}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-2 whitespace-pre-line">
                    {app.credentials}
                  </p>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ask for more verification
                    </label>
                    <textarea
                      value={verificationDrafts[app.id] || ''}
                      onChange={(e) =>
                        setVerificationDrafts((prev) => ({
                          ...prev,
                          [app.id]: e.target.value,
                        }))
                      }
                      className="w-full min-h-[72px] rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      placeholder="Request specific documents or clarifications..."
                    />
                    <button
                      type="button"
                      onClick={() => sendVerificationRequest(app.id)}
                      disabled={sendingVerificationFor === app.id}
                      className="mt-2 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sendingVerificationFor === app.id
                        ? 'Sending...'
                        : 'Send verification email'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">
                    Status: {app.status}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{trail.name}</p>
                  <p className="text-xs text-gray-500">
                    {trail.sport_type} • {trail.difficulty} • {trail.location}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted by {trail.submitted_by_name || 'Expert'} ({trail.submitted_by_email || 'N/A'})
                  </p>
                </div>
                <div className="flex gap-2">
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
