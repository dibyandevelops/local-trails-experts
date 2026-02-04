'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreateEventInput, Difficulty, ExpertiseLevel, SportType } from '@/types';

type ExpertApplication = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  sports: SportType[] | null;
  credentials: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
};

const expertiseOptions: ExpertiseLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

const difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard'];

const sportOptions: { value: SportType; label: string }[] = [
  { value: 'mtb', label: 'MTB Trail Rides' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'trail_running', label: 'Trail Running' },
  { value: 'training', label: 'Training & Coaching' },
  { value: 'local_tour', label: 'Local Tours' },
];

export default function AdminPage() {
  const [applications, setApplications] = useState<ExpertApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [appError, setAppError] = useState<string | null>(null);
  const [appNotice, setAppNotice] = useState<string | null>(null);

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
  });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);

  const applicationsEndpoint = useMemo(() => {
    if (statusFilter === 'all') {
      return '/api/admin/expert-applications';
    }
    return `/api/admin/expert-applications?status=${statusFilter}`;
  }, [statusFilter]);

  useEffect(() => {
    void fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationsEndpoint]);

  const fetchApplications = async () => {
    setLoadingApps(true);
    setAppError(null);
    setAppNotice(null);
    try {
      const res = await fetch(applicationsEndpoint);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load applications');
      }
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error loading applications', error);
      setAppError('Unable to load expert applications.');
    } finally {
      setLoadingApps(false);
    }
  };

  const updateApplicationStatus = async (
    id: string,
    status: ExpertApplication['status']
  ) => {
    try {
      const res = await fetch('/api/admin/expert-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update');
      }
      setApplications((prev) => prev.filter((app) => app.id !== id));
      if (data?.tempPassword) {
        setAppNotice(
          `Temp password for ${data.application?.email}: ${data.tempPassword}`
        );
      }
    } catch (error) {
      console.error('Error updating application', error);
      setAppError('Unable to update application status.');
    }
  };

  const handleEventChange = (field: keyof CreateEventInput, value: string | number) => {
    setEventForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setEventMessage(null);

    if (!eventForm.title || !eventForm.event_date || !eventForm.required_expertise) {
      setEventMessage('Please fill in the required fields.');
      return;
    }

    try {
      setEventSubmitting(true);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create event');
      }
      setEventMessage('Event created successfully.');
      setEventForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        event_date: '',
        organizer_name: '',
        organizer_email: '',
        meeting_point: '',
        city: '',
        price_npr: 0,
        max_participants: 20,
      }));
    } catch (error) {
      console.error('Error creating event', error);
      setEventMessage('Unable to create event.');
    } finally {
      setEventSubmitting(false);
    }
  };

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
          Create New Event
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Publish events on behalf of experts or the platform.
        </p>
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {sportOptions.map((sport) => (
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
      </section>
    </div>
  );
}
