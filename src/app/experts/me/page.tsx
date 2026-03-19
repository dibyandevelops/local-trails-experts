'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Event, EventParticipant, User, SportType } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { TRAIL_SPORTS, getSportLabel } from '@/services/constants/sports';
import * as Dialog from '@radix-ui/react-dialog';
import EventForm from '@/components/feature-components/event-form/event-form';
import { useQuery } from '@tanstack/react-query';
import { fetchExpertStravaSummary } from '@/services/experts/experts.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { ApiPath } from '@/services/api/paths';
import { hideTrail, unhideTrail } from '@/services/trails/trails.service';
import { resizeImageToDataUrl } from '@/lib/image';
import VerificationDetailsForm from '@/components/feature-components/verification-details-form';

type ExpertTrailRequest = {
  id: string;
  trail_id: string;
  requester_user_id: string | null;
  requester_name: string | null;
  requester_email: string;
  description: string | null;
  preferred_date: string | null;
  created_at: string;
  trail_name: string;
  trail_sport_type: string | null;
  trail_location: string | null;
};

type ExpertTrail = {
  id: string;
  name: string;
  location: string | null;
  sport_type: string | null;
  difficulty: string | null;
  created_at: string;
  is_hidden: boolean;
};

type ExpertEventWithParticipants = Event & {
  participants?: EventParticipant[];
};

export default function ExpertProfilePage() {
  const router = useRouter();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<ExpertEventWithParticipants[]>([]);
  const [trailRequests, setTrailRequests] = useState<ExpertTrailRequest[]>([]);
  const [createdTrails, setCreatedTrails] = useState<ExpertTrail[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTrailRequests, setLoadingTrailRequests] = useState(true);
  const [loadingTrails, setLoadingTrails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [requestForEvent, setRequestForEvent] = useState<ExpertTrailRequest | null>(
    null
  );
  const [hidingTrailId, setHidingTrailId] = useState<string | null>(null);
  const [unhidingTrailId, setUnhidingTrailId] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [participantsEventTitle, setParticipantsEventTitle] = useState('');
  const [participantsList, setParticipantsList] = useState<EventParticipant[]>([]);
  const bioRef = useRef<HTMLTextAreaElement | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    bio: '',
    sports: '',
    phone: '',
    profilePhotoUrl: '',
    verificationYearsExperience: '',
    verificationCertifications: '',
    verificationGuidingHistory: '',
    verificationSafetyTraining: '',
    verificationLinks: '',
  });
  const initials =
    editForm.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'EX';

  const sportOptions: { value: SportType; label: string }[] = TRAIL_SPORTS;
  const { data: stravaSummary } = useQuery({
    queryKey: QUERY_KEYS.experts.strava(currentUser?.id),
    queryFn: ({ signal }) => fetchExpertStravaSummary(currentUser?.id || '', signal),
    enabled: !!currentUser?.id && currentUser.role === 'expert',
  });

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
        profilePhotoUrl: currentUser.profile_photo_url || '',
        verificationYearsExperience: currentUser.verification_years_experience || '',
        verificationCertifications: currentUser.verification_certifications || '',
        verificationGuidingHistory: currentUser.verification_guiding_history || '',
        verificationSafetyTraining: currentUser.verification_safety_training || '',
        verificationLinks: currentUser.verification_links || '',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!user) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('focus') === 'bio') {
        window.setTimeout(() => {
          bioRef.current?.focus();
          bioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const msg = url.searchParams.get('message');
      if (msg === 'google_connected') {
        setGoogleNotice('Google account connected successfully.');
        url.searchParams.delete('message');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const fetchEventsAndRequests = async () => {
      try {
        if (!currentUser || currentUser.role !== 'expert') {
          setLoadingEvents(false);
          setLoadingTrailRequests(false);
          return;
        }

        const [eventsRes, requestsRes, trailsRes] = await Promise.all([
          fetch(`/api/experts/${currentUser.id}/events`),
          fetch('/api/experts/me/alerts'),
          fetch('/api/experts/me/trails'),
        ]);
        const eventsData = await eventsRes.json();
        const requestsData = await requestsRes.json();
        const trailsData = await trailsRes.json();
        setEvents(eventsData.events || []);
        setTrailRequests(requestsData.requests || []);
        setCreatedTrails(trailsData.trails || []);
      } catch (error) {
        console.error('Error loading expert profile', error);
      } finally {
        setLoadingEvents(false);
        setLoadingTrailRequests(false);
        setLoadingTrails(false);
      }
    };

    fetchEventsAndRequests();
  }, [currentUser]);

  if (loadingUser || loadingEvents || loadingTrailRequests || loadingTrails) {
    return <div className="text-gray-600">Loading profile...</div>;
  }

  if (!user || user.role !== 'expert') {
    return (
      <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3">
        You must be logged in as an expert to view this page.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Google Login</h2>
            <p className="text-sm text-gray-600">
              Connect your Google account to enable one-tap login
            </p>
          </div>
          {user.google_sub ? (
            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              Connected
            </span>
          ) : (
            <Link
              href={`/api/auth/google/start?mode=connect&role=expert&next=${encodeURIComponent('/experts/me')}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Connect Google
            </Link>
          )}
        </div>
        {googleNotice && (
          <p className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
            {googleNotice}
          </p>
        )}
        {!user.google_sub && (
          <p className="mt-3 text-xs text-gray-500">
            For security, the Google email must match your expert account email.
          </p>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Edit Profile
        </h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {stravaSummary?.connected ? (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
              Strava Connected
            </span>
          ) : (
            <Link
              href={`${ApiPath.StravaAuthorize}?mode=connect`}
              className="inline-flex items-center rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100"
            >
              Connect with Strava
            </Link>
          )}
          {stravaSummary?.syncedAt && (
            <span className="text-xs text-gray-500">
              Last synced {format(new Date(stravaSummary.syncedAt), 'PPP p')}
            </span>
          )}
        </div>
        {stravaSummary?.connected && (
          <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-orange-700">
            {stravaSummary?.profile?.id && (
              <a
                href={`https://www.strava.com/athletes/${stravaSummary.profile.id}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-orange-700 underline decoration-orange-400"
              >
                View on Strava
              </a>
            )}
            <span className="uppercase tracking-wide">Powered by Strava</span>
          </div>
        )}
        {user.is_verified_expert ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold mb-4">
            Verified Expert
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-4">
            Pending Verification
          </span>
        )}
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
              const selectedSports = editForm.sports
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
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
                  profile_photo_url: editForm.profilePhotoUrl || null,
                  verification_years_experience:
                    editForm.verificationYearsExperience || null,
                  verification_certifications:
                    editForm.verificationCertifications || null,
                  verification_guiding_history:
                    editForm.verificationGuidingHistory || null,
                  verification_safety_training:
                    editForm.verificationSafetyTraining || null,
                  verification_links: editForm.verificationLinks || null,
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
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              {editForm.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editForm.profilePhotoUrl}
                  alt="Expert profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await resizeImageToDataUrl(file);
                    setEditForm({ ...editForm, profilePhotoUrl: dataUrl });
                  } catch (error) {
                    console.error(error);
                    setMessage('Unable to load profile photo.');
                  }
                }}
                className="block w-full text-sm text-gray-700"
              />
            </div>
          </div>
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
              id="expert-bio"
              value={editForm.bio}
              onChange={(event) =>
                setEditForm({ ...editForm, bio: event.target.value })
              }
              ref={bioRef}
              placeholder="Tell about yourself."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
            />
            <p className="mt-2 text-xs text-gray-500">
              Include years of experience, certifications, guiding history, safety
              training/first-aid, and any portfolio or Strava links.
            </p>
          </div>
          <div className="md:col-span-2">
            <VerificationDetailsForm
              values={{
                yearsExperience: editForm.verificationYearsExperience,
                certifications: editForm.verificationCertifications,
                guidingHistory: editForm.verificationGuidingHistory,
                safetyTraining: editForm.verificationSafetyTraining,
                links: editForm.verificationLinks,
              }}
              onChange={(next) =>
                setEditForm({
                  ...editForm,
                  verificationYearsExperience: next.yearsExperience,
                  verificationCertifications: next.certifications,
                  verificationGuidingHistory: next.guidingHistory,
                  verificationSafetyTraining: next.safetyTraining,
                  verificationLinks: next.links,
                })
              }
              containerClassName="rounded-lg border border-gray-200 bg-white p-4"
              labelClassName="block text-xs font-medium text-gray-700 mb-1"
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              textareaClassName="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              titleClassName="text-sm font-semibold text-gray-900"
              descriptionClassName="mt-1 text-xs text-gray-500 mb-3"
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

      <section id="trail-requests" className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Requested Trails For You
          </h2>
          {trailRequests.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
              {trailRequests.length} alert{trailRequests.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {trailRequests.length === 0 ? (
          <p className="text-sm text-gray-600">No trail requests assigned to you.</p>
        ) : (
          <div className="space-y-3">
            {trailRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {request.trail_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.trail_location || 'Unknown location'}
                      {request.trail_sport_type
                        ? ` • ${getSportLabel(request.trail_sport_type)}`
                        : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Requested {format(new Date(request.created_at), 'PPP p')}
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Participant: {request.requester_name || 'Participant'} ({request.requester_email})
                </p>
                {request.preferred_date && (
                  <p className="mt-1 text-xs text-gray-600">
                    Preferred date: {request.preferred_date.slice(0, 10)}
                  </p>
                )}
                {request.description && (
                  <p className="mt-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {request.description}
                  </p>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRequestForEvent(request);
                      setCreateEventOpen(true);
                    }}
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
                  >
                    Create Event For This Participant
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Events You Host
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have not created any events yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Participants</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const participants = event.participants || [];
                  return (
                    <tr key={event.id} className="border-t border-gray-200 align-top">
                      <td className="px-3 py-3">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-green-700"
                        >
                          {event.title}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {event.city ? event.city : '—'}
                        </div>
                        {event.sport_type && (
                          <div className="text-xs text-gray-500">
                            {getSportLabel(event.sport_type)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {format(new Date(event.event_date), 'PPP p')}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {participants.length === 0 ? (
                          <span className="text-gray-400">No participants yet</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              {participants.length} joined
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setParticipantsEventTitle(event.title);
                                setParticipantsList(participants);
                                setParticipantsModalOpen(true);
                              }}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              View list
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/events/${event.id}`)}
                          className="text-xs font-semibold text-green-700 hover:text-green-800"
                        >
                          View event
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Trails You Created
        </h2>
        {createdTrails.length === 0 ? (
          <p className="text-sm text-gray-600">
            You have not created any trails yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Trail</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Sport</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {createdTrails.map((trail) => (
                  <tr key={trail.id} className="border-t border-gray-200">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/trails/${trail.id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-green-700"
                      >
                        {trail.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {trail.location || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {trail.sport_type ? getSportLabel(trail.sport_type) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {trail.is_hidden ? 'Hidden' : 'Visible'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {!trail.is_hidden && (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Hide trail \"${trail.name}\"? It will be hidden from the public list.`
                            );
                            if (!confirmed) return;
                            try {
                              setHidingTrailId(trail.id);
                              await hideTrail(trail.id);
                              setCreatedTrails((prev) =>
                                prev.map((item) =>
                                  item.id === trail.id
                                    ? { ...item, is_hidden: true }
                                    : item
                                )
                              );
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Failed to hide trail');
                            } finally {
                              setHidingTrailId(null);
                            }
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          disabled={hidingTrailId === trail.id}
                        >
                          {hidingTrailId === trail.id ? 'Hiding...' : 'Hide'}
                        </button>
                      )}
                      {trail.is_hidden && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setUnhidingTrailId(trail.id);
                              await unhideTrail(trail.id);
                              setCreatedTrails((prev) =>
                                prev.map((item) =>
                                  item.id === trail.id
                                    ? { ...item, is_hidden: false }
                                    : item
                                )
                              );
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Failed to unhide trail');
                            } finally {
                              setUnhidingTrailId(null);
                            }
                          }}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          disabled={unhidingTrailId === trail.id}
                        >
                          {unhidingTrailId === trail.id ? 'Unhiding...' : 'Unhide'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/trails/create?trailId=${trail.id}`)}
                        className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog.Root
        open={createEventOpen}
        onOpenChange={(open) => {
          setCreateEventOpen(open);
          if (!open) {
            setRequestForEvent(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <Dialog.Title className="truncate pr-2 text-sm font-semibold text-gray-900">
                Create Event For Requested Trail
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">
                Close
              </Dialog.Close>
            </div>
            {requestForEvent ? (
              <div className="h-[calc(88vh-52px)] overflow-y-auto p-4">
                <EventForm
                  mode="create"
                  embedded
                  lockTrailAndSport
                  lockEventDate
                  prefillTrailId={requestForEvent.trail_id}
                  prefillSport={(requestForEvent.trail_sport_type || 'mtb') as SportType}
                  requestedByName={requestForEvent.requester_name || 'Participant'}
                  requestedByEmail={requestForEvent.requester_email}
                  requestedDate={requestForEvent.preferred_date || ''}
                  requestedTrailRequestId={requestForEvent.id}
                  onCompleted={() => {
                    setCreateEventOpen(false);
                    setTrailRequests((prev) =>
                      prev.filter((request) => request.id !== requestForEvent.id)
                    );
                    setRequestForEvent(null);
                  }}
                  onCancel={() => {
                    setCreateEventOpen(false);
                    setRequestForEvent(null);
                  }}
                />
              </div>
            ) : (
              <div className="grid h-[calc(88vh-52px)] place-items-center text-sm text-gray-600">
                Select a request to create event.
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={participantsModalOpen} onOpenChange={setParticipantsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <Dialog.Title className="text-sm font-semibold text-gray-900">
                Participants · {participantsEventTitle}
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">
                Close
              </Dialog.Close>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {participantsList.length === 0 ? (
                <p className="text-sm text-gray-600">No participants yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Experience</th>
                      <th className="px-3 py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantsList.map((participant) => (
                      <tr key={participant.id} className="border-t border-gray-200">
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                          {participant.participant_name}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {participant.participant_email}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {participant.phone || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {participant.expertise_level}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {format(new Date(participant.joined_at), 'PP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
