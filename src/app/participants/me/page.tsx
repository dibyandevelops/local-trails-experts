'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@/types';
import { format } from 'date-fns';
import { useCurrentUser } from '@/hooks/use-current-user';
import { TRAIL_SPORTS, getSportLabel } from '@/services/constants/sports';

type ParticipantEvent = {
  id: string;
  title: string;
  event_date: string;
  city: string | null;
  sport_type: string | null;
  joined_at: string;
};

type ParticipantTrailRequest = {
  id: string;
  trail_id: string;
  trail_name: string;
  trail_location: string | null;
  trail_sport_type: string | null;
  requester_email: string;
  description: string | null;
  preferred_date: string | null;
  assigned_expert_user_id: string | null;
  assigned_expert_name: string | null;
  assigned_expert_email: string | null;
  created_at: string;
};

type ExpertOption = {
  id: string;
  name: string | null;
  email: string;
};

export default function ParticipantProfilePage() {
  const router = useRouter();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<ParticipantEvent[]>([]);
  const [trailRequests, setTrailRequests] = useState<ParticipantTrailRequest[]>([]);
  const [experts, setExperts] = useState<ExpertOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    bio: '',
    sports: '',
    phone: '',
  });

  const sportOptions = TRAIL_SPORTS;

  useEffect(() => {
    setUser(currentUser || null);
    if (currentUser) {
      setEditForm({
        name: currentUser.name || '',
        city: currentUser.city || '',
        bio: currentUser.bio || '',
        sports: Array.isArray(currentUser.sports)
          ? currentUser.sports.join(', ')
          : '',
        phone: currentUser.phone || '',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!currentUser || currentUser.role !== 'participant') {
          setLoadingEvents(false);
          setLoadingRequests(false);
          return;
        }
        const [eventsRes, requestsRes, expertsRes] = await Promise.all([
          fetch('/api/participants/me/events'),
          fetch('/api/participants/me/trail-requests'),
          fetch('/api/experts?verified=true'),
        ]);
        const eventsData = await eventsRes.json();
        const requestsData = await requestsRes.json();
        const expertsData = await expertsRes.json();
        setEvents(eventsData.events || []);
        setTrailRequests(requestsData.requests || []);
        setExperts(expertsData.experts || []);
      } catch (error) {
        console.error('Error loading participant profile', error);
      } finally {
        setLoadingEvents(false);
        setLoadingRequests(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (loadingUser || loadingEvents || loadingRequests) {
    return <div className="text-gray-600">Loading profile...</div>;
  }

  if (!user || user.role !== 'participant') {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3">
        You must be logged in as a participant to view this page.
      </div>
    );
  }

  const parseSelectedSports = () =>
    editForm.sports
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Edit Profile
        </h2>
        {message && (
          <p
            className={`text-sm border rounded-lg px-3 py-2 mb-3 ${
              message.includes('select at least one sport')
                ? 'text-red-600 bg-red-50 border-red-100'
                : 'text-green-700 bg-green-50 border-green-100'
            }`}
          >
            {message}
          </p>
        )}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setMessage(null);
            try {
              const selectedSports = parseSelectedSports();
              if (selectedSports.length === 0) {
                setMessage('Please select at least one sport.');
                setSaving(false);
                return;
              }
              const response = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: editForm.name,
                  city: editForm.city,
                  bio: editForm.bio,
                  sports: selectedSports,
                  phone: editForm.phone,
                }),
              });
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data?.error || 'Failed to update profile');
              }
              setUser(data.user);
              setMessage('Profile updated.');
            } catch (error) {
              console.error('Error updating profile', error);
              setMessage('Unable to update profile.');
            } finally {
              setSaving(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) =>
                setEditForm({ ...editForm, name: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={editForm.city}
              onChange={(event) =>
                setEditForm({ ...editForm, city: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={editForm.bio}
              onChange={(event) =>
                setEditForm({ ...editForm, bio: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sports
            </label>
            <div className="flex flex-wrap gap-2">
              {sportOptions.map((sport) => {
                const selected = editForm.sports
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .includes(sport.value);
                return (
                  <button
                    key={sport.value}
                    type="button"
                    onClick={() => {
                      const current = editForm.sports
                        .split(',')
                        .map((value) => value.trim())
                        .filter(Boolean);
                      const updated = selected
                        ? current.filter((value) => value !== sport.value)
                        : [...current, sport.value];
                      setEditForm({ ...editForm, sports: updated.join(', ') });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      selected
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-600'
                    }`}
                  >
                    {sport.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(event) =>
                setEditForm({ ...editForm, phone: event.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="+9779812345678"
            />
            <p className="text-xs text-gray-500 mt-1">
              Phone number must be unique across all users.
            </p>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Your Trail Activity Requests
        </h2>
        {requestMessage && (
          <p className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {requestMessage}
          </p>
        )}
        {trailRequests.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have not requested any trail activities yet.
          </p>
        ) : (
          <div className="space-y-3">
            {trailRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{request.trail_name}</p>
                    <p className="text-xs text-gray-500">
                      {request.trail_location || 'Unknown location'}
                      {request.trail_sport_type
                        ? ` • ${getSportLabel(request.trail_sport_type)}`
                        : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Requested on {format(new Date(request.created_at), 'PPP p')}
                  </p>
                </div>
                {request.description && (
                  <p className="mb-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {request.description}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Assigned Expert
                    </label>
                    <select
                      value={request.assigned_expert_user_id || ''}
                      onChange={(event) => {
                        const nextExpertId = event.target.value;
                        setTrailRequests((prev) =>
                          prev.map((item) =>
                            item.id === request.id
                              ? { ...item, assigned_expert_user_id: nextExpertId }
                              : item
                          )
                        );
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select expert</option>
                      {experts.map((expert) => (
                        <option key={expert.id} value={expert.id}>
                          {expert.name || expert.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={request.preferred_date?.slice(0, 10) || ''}
                      onChange={(event) => {
                        const nextDate = event.target.value;
                        setTrailRequests((prev) =>
                          prev.map((item) =>
                            item.id === request.id
                              ? { ...item, preferred_date: nextDate }
                              : item
                          )
                        );
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setRequestMessage(null);
                      if (!request.assigned_expert_user_id || !request.preferred_date) {
                        setRequestMessage('Please select expert and preferred date.');
                        return;
                      }
                      try {
                        setSavingRequestId(request.id);
                        const response = await fetch(
                          `/api/participants/me/trail-requests/${request.id}`,
                          {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              expert_user_id: request.assigned_expert_user_id,
                              preferred_date: request.preferred_date,
                            }),
                          }
                        );
                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data?.error || 'Failed to update request');
                        }
                        setRequestMessage('Request updated successfully.');
                      } catch (error) {
                        setRequestMessage(
                          error instanceof Error ? error.message : 'Failed to update request'
                        );
                      } finally {
                        setSavingRequestId(null);
                      }
                    }}
                    disabled={savingRequestId === request.id}
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {savingRequestId === request.id
                      ? 'Updating...'
                      : 'Change Date / Expert'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        'Cancel this trail activity request?'
                      );
                      if (!confirmed) return;
                      setRequestMessage(null);
                      try {
                        setCancellingRequestId(request.id);
                        const response = await fetch(
                          `/api/participants/me/trail-requests/${request.id}`,
                          {
                            method: 'DELETE',
                          }
                        );
                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data?.error || 'Failed to cancel request');
                        }
                        setTrailRequests((prev) =>
                          prev.filter((item) => item.id !== request.id)
                        );
                        setRequestMessage('Request cancelled.');
                      } catch (error) {
                        setRequestMessage(
                          error instanceof Error ? error.message : 'Failed to cancel request'
                        );
                      } finally {
                        setCancellingRequestId(null);
                      }
                    }}
                    disabled={cancellingRequestId === request.id}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    {cancellingRequestId === request.id ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Events You Joined
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have not joined any events yet.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-green-700"
                  >
                    {event.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {format(new Date(event.event_date), 'PPP p')}
                    {event.city ? ` • ${event.city}` : ''}
                  </p>
                  {event.sport_type && (
                    <p className="text-xs text-gray-500">
                      Sport: {event.sport_type}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/events`)}
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  View event list
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
