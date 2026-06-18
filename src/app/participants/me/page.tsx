'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import type { User } from '@/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { TRAIL_SPORTS, getSportLabel } from '@/services/constants/sports';
import { resizeImageToDataUrl } from '@/lib/image';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import DateText from '@/components/ui/date-text';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

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

type ParticipantRideProgramRequest = {
  id: string;
  program_id: string;
  expert_user_id: string;
  trail_id: string;
  requester_phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  group_size: number;
  offered_price_npr: number | null;
  notes: string | null;
  expert_response_note?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  created_at: string;
  program_title: string | null;
  max_group_size: number;
  price_npr: number | null;
  duration_note: string | null;
  meeting_point_note: string | null;
  program_availability_weekdays?: string[] | null;
  available_time_note?: string | null;
  trail_name: string | null;
  trail_slug: string | null;
  trail_location: string | null;
  expert_name: string | null;
  expert_email: string | null;
  expert_availability_weekdays: string[] | null;
};

type ParticipantBooking = {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  city: string | null;
  total_price_npr: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  created_at: string;
};

type ExpertOption = {
  id: string;
  name: string | null;
  email: string;
};

const profileActionButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-emerald-700/70 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/80';

const profileWarningButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-amber-500/80 dark:bg-amber-950/80 dark:text-white dark:hover:border-amber-400 dark:hover:bg-amber-900/80';

const floatingProfileActionButtonClass =
  'fixed bottom-20 right-4 z-40 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-950 shadow-lg transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-amber-500/80 dark:bg-slate-900 dark:text-white dark:hover:border-amber-400 dark:hover:bg-amber-950/80';

const profileActionIconClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[10px] font-black leading-none text-white dark:bg-emerald-500 dark:text-slate-950';

const profileWarningIconClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500 text-[10px] font-black leading-none text-white dark:bg-amber-400 dark:text-slate-950';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const DATE_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getRequestedWeekday(date: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return DATE_WEEKDAYS[parsed.getDay()];
}

export default function ParticipantProfilePage() {
  const router = useRouter();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<ParticipantEvent[]>([]);
  const [bookings, setBookings] = useState<ParticipantBooking[]>([]);
  const [trailRequests, setTrailRequests] = useState<ParticipantTrailRequest[]>([]);
  const [rideProgramRequests, setRideProgramRequests] = useState<ParticipantRideProgramRequest[]>([]);
  const [experts, setExperts] = useState<ExpertOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [rideProgramRequestMessage, setRideProgramRequestMessage] = useState<string | null>(null);
  const [selectedRideProgramRequestId, setSelectedRideProgramRequestId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    bio: '',
    sports: '',
    availabilityWeekdays: [] as string[],
    phone: '',
    profilePhotoUrl: '',
  });

  const sportOptions = TRAIL_SPORTS;
  const selectedRideProgramRequest =
    rideProgramRequests.find((request) => request.id === selectedRideProgramRequestId) || null;

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
        availabilityWeekdays: Array.isArray(currentUser.availability_weekdays)
          ? currentUser.availability_weekdays
          : [],
        phone: currentUser.phone || '',
        profilePhotoUrl: currentUser.profile_photo_url || '',
      });
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const msg = url.searchParams.get('message');
      if (msg === 'google_connected') {
        setGoogleNotice('Google account connected. You can use Google login next time.');
        url.searchParams.delete('message');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!currentUser || currentUser.role !== 'participant') {
          setLoadingEvents(false);
          setLoadingBookings(false);
          setLoadingRequests(false);
          return;
        }
        const [eventsRes, requestsRes, rideRequestsRes, expertsRes, bookingsRes] = await Promise.all([
          fetch('/api/participants/me/events'),
          fetch('/api/participants/me/trail-requests'),
          fetch('/api/participants/me/ride-program-requests'),
          fetch('/api/experts?verified=true'),
          fetch('/api/bookings/me'),
        ]);
        const eventsData = await eventsRes.json();
        const requestsData = await requestsRes.json();
        const rideRequestsData = await rideRequestsRes.json();
        const expertsData = await expertsRes.json();
        const bookingsData = await bookingsRes.json();
        setEvents(eventsData.events || []);
        setTrailRequests(requestsData.requests || []);
        setRideProgramRequests(rideRequestsData.requests || []);
        setExperts(expertsData.experts || []);
        setBookings(bookingsData.bookings || []);
      } catch (error) {
        console.error('Error loading participant profile', error);
      } finally {
        setLoadingEvents(false);
        setLoadingBookings(false);
        setLoadingRequests(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (loadingUser || loadingEvents || loadingBookings || loadingRequests) {
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

  const initials =
    editForm.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P';
  const isProfileComplete = Boolean(
    editForm.name.trim() &&
      editForm.city.trim() &&
      editForm.bio.trim() &&
      parseSelectedSports().length > 0 &&
      editForm.availabilityWeekdays.length > 0 &&
      editForm.phone.trim()
  );
  const paidBookings = bookings.filter((item) => item.payment_status === 'paid');

  const handleSaveProfile = async (event: React.FormEvent) => {
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
      if (!acceptTerms) {
        setMessage('Please accept the terms before saving.');
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
          availability_weekdays: editForm.availabilityWeekdays,
          phone: editForm.phone,
          profile_photo_url: editForm.profilePhotoUrl || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update profile');
      }
      setUser(data.user);
      queryClient.setQueryData(QUERY_KEYS.auth.me, data.user);
      window.dispatchEvent(new Event('auth-changed'));
      setMessage('Profile updated.');
      setProfileModalOpen(false);
    } catch (error) {
      console.error('Error updating profile', error);
      setMessage('Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const updateRideProgramRequest = async (request: ParticipantRideProgramRequest) => {
    setRideProgramRequestMessage(null);
    if (!request.preferred_date) {
      setRideProgramRequestMessage('Please select a preferred date.');
      return;
    }

    try {
      setSavingRequestId(request.id);
      const response = await fetch(`/api/participants/me/ride-program-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_date: request.preferred_date,
          preferred_time: request.preferred_time,
          requester_phone: request.requester_phone,
          group_size: request.group_size,
          offered_price_npr: request.offered_price_npr,
          notes: request.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update ride request');
      }
      setRideProgramRequestMessage('Ride request updated.');
    } catch (error) {
      setRideProgramRequestMessage(
        error instanceof Error ? error.message : 'Failed to update ride request.'
      );
    } finally {
      setSavingRequestId(null);
    }
  };

  const cancelRideProgramRequest = async (requestId: string) => {
    setRideProgramRequestMessage(null);
    try {
      setCancellingRequestId(requestId);
      const response = await fetch(`/api/participants/me/ride-program-requests/${requestId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to cancel ride request');
      }
      setRideProgramRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, status: 'cancelled' } : request
        )
      );
      setRideProgramRequestMessage('Ride request cancelled.');
    } catch (error) {
      setRideProgramRequestMessage(
        error instanceof Error ? error.message : 'Failed to cancel ride request.'
      );
    } finally {
      setCancellingRequestId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Participant Profile
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Preferences
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Keep your riding profile ready
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Update your details, manage requests, and track upcoming rides.
          </p>
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-100 dark:border-slate-700 dark:bg-slate-800">
                {editForm.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editForm.profilePhotoUrl}
                    alt={editForm.name || 'Participant profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-black text-emerald-900 dark:text-emerald-100">
                    {initials}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black text-gray-950 dark:text-white">
                    {editForm.name || 'Participant profile'}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isProfileComplete
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                    }`}
                  >
                    {isProfileComplete ? 'Profile ready' : 'Profile incomplete'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {editForm.city || 'City not added'} · {parseSelectedSports().length > 0 ? parseSelectedSports().map((sport) => getSportLabel(sport)).join(', ') : 'Sports not added'}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 dark:text-slate-200">
                  {editForm.bio?.trim() || 'Add a short riding profile so experts can understand your interests, availability, and ride expectations.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className={isProfileComplete ? profileActionButtonClass : profileWarningButtonClass}
            >
              <span className={isProfileComplete ? profileActionIconClass : profileWarningIconClass}>
                {isProfileComplete ? 'E' : '!'}
              </span>
              {isProfileComplete ? 'Edit profile' : 'Complete profile'}
            </button>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {message && (
            <p className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {message}
            </p>
          )}
          {!isProfileComplete && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              Your profile is incomplete. Add your details to improve ride requests and expert coordination.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Email</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{user.email || 'Not added'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Phone</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">{editForm.phone?.trim() || 'Not added'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Google Login</p>
              {user.google_sub ? (
                <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                  Connected
                </span>
              ) : (
                <Link
                  href={`/api/auth/google/start?mode=connect&next=${encodeURIComponent('/participants/me')}`}
                  className="mt-1 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                >
                  Connect Google
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {editForm.availabilityWeekdays.length > 0 ? (
              editForm.availabilityWeekdays.map((day) => (
                <span key={day} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {day}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 dark:text-slate-400">Availability not added</span>
            )}
          </div>

          {googleNotice && (
            <p className="mt-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              {googleNotice}
            </p>
          )}
          {!user.google_sub && (
            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              For security, the Google email must match your participant account email.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Expert ride requests</p>
          <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{rideProgramRequests.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Joined events</p>
          <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{events.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Paid bookings</p>
          <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{paidBookings.length}</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Ride with Experts Requests
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Manage requested expert ride programs separately from scheduled events.
            </p>
          </div>
          <Link
            href="/ride-with-experts"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            Browse rides
          </Link>
        </div>
        {rideProgramRequestMessage && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            {rideProgramRequestMessage}
          </p>
        )}
        {rideProgramRequests.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            You have not requested any expert ride programs yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Ride</th>
                  <th className="px-3 py-2">Expert</th>
                  <th className="px-3 py-2">Preferred</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rideProgramRequests.map((request) => (
                  <tr key={request.id} className="border-t border-gray-200 align-middle dark:border-slate-800">
                    <td className="px-3 py-3">
                      <p className="max-w-[300px] text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {request.program_title || request.trail_name || 'Expert ride request'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {request.trail_location || 'Trail location not set'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                      {request.expert_name || request.expert_email || 'Expert'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                      <p>{request.preferred_date?.slice(0, 10) || 'Not selected'}</p>
                      {request.preferred_time && <p>{request.preferred_time}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {request.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRideProgramRequestId(request.id)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                      >
                        View details
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
        open={Boolean(selectedRideProgramRequest)}
        onOpenChange={(open) => {
          if (!open) setSelectedRideProgramRequestId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Ride request details
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  View full information and update your request if it is still active.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>

            {selectedRideProgramRequest && (() => {
              const request = selectedRideProgramRequest;
              const requestedWeekday = getRequestedWeekday(request.preferred_date);
              const programWeekdays = Array.isArray(request.program_availability_weekdays)
                ? request.program_availability_weekdays
                : [];
              const expertWeekdays = Array.isArray(request.expert_availability_weekdays)
                ? request.expert_availability_weekdays
                : [];
              const availableWeekdays =
                programWeekdays.length > 0 ? programWeekdays : expertWeekdays;
              const dateMatchesAvailability =
                !requestedWeekday ||
                availableWeekdays.length === 0 ||
                availableWeekdays.includes(requestedWeekday);
              const canEdit = ['pending', 'accepted'].includes(request.status);

              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        {request.program_title || request.trail_name || 'Expert ride request'}
                      </h3>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-gray-600 dark:text-slate-300 md:grid-cols-2">
                      <p>Expert: {request.expert_name || request.expert_email || 'Expert'}</p>
                      <p>Trail: {request.trail_name || 'Trail not set'}</p>
                      <p>Location: {request.trail_location || 'Not set'}</p>
                      <p>Requested: <DateText value={request.created_at} pattern="PPP p" /></p>
                      <p>Max group size: {request.max_group_size || 'Not set'}</p>
                      <p>Suggested price: {request.price_npr ? 'NPR ' + request.price_npr : 'Not set'}</p>
                      {request.duration_note && <p>Duration: {request.duration_note}</p>}
                      {request.meeting_point_note && <p>Meeting: {request.meeting_point_note}</p>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
                    <span className="font-semibold">
                      {programWeekdays.length > 0 ? 'Program availability: ' : 'Expert availability: '}
                    </span>
                    {availableWeekdays.length > 0 ? availableWeekdays.join(', ') : 'Flexible'}
                    {request.available_time_note ? ' · ' + request.available_time_note : ''}
                    {requestedWeekday && (
                      <span
                        className={
                          dateMatchesAvailability
                            ? 'ml-2 font-semibold text-emerald-700 dark:text-emerald-200'
                            : 'ml-2 font-semibold text-red-700 dark:text-red-200'
                        }
                      >
                        Selected date is {requestedWeekday}
                        {dateMatchesAvailability ? '' : ' and does not match availability'}
                      </span>
                    )}
                  </div>

                  {request.expert_response_note && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
                      <span className="font-semibold">Expert response: </span>
                      {request.expert_response_note}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      Preferred date
                      <input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={request.preferred_date?.slice(0, 10) || ''}
                        disabled={!canEdit}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setRideProgramRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id ? { ...item, preferred_date: nextDate } : item
                            )
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      Preferred time
                      <input
                        type="time"
                        value={request.preferred_time || ''}
                        disabled={!canEdit}
                        onChange={(event) => {
                          const nextTime = event.target.value;
                          setRideProgramRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id ? { ...item, preferred_time: nextTime } : item
                            )
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      Group size
                      <input
                        type="number"
                        min={1}
                        max={request.max_group_size || 50}
                        value={request.group_size || 1}
                        disabled={!canEdit}
                        onChange={(event) => {
                          const groupSize = Number(event.target.value || 1);
                          setRideProgramRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id ? { ...item, group_size: groupSize } : item
                            )
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      Offered amount
                      <input
                        type="number"
                        min={0}
                        value={request.offered_price_npr ?? ''}
                        disabled={!canEdit}
                        placeholder={request.price_npr ? 'NPR ' + request.price_npr : 'Optional'}
                        onChange={(event) => {
                          const nextPrice = event.target.value ? Number(event.target.value) : null;
                          setRideProgramRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id
                                ? { ...item, offered_price_npr: nextPrice }
                                : item
                            )
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300 md:col-span-2">
                      Notes
                      <textarea
                        rows={3}
                        value={request.notes || ''}
                        disabled={!canEdit}
                        onChange={(event) => {
                          const notes = event.target.value;
                          setRideProgramRequests((prev) =>
                            prev.map((item) =>
                              item.id === request.id ? { ...item, notes } : item
                            )
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
                      />
                    </label>
                  </div>

                  {canEdit ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => updateRideProgramRequest(request)}
                        disabled={savingRequestId === request.id || !dateMatchesAvailability}
                        className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200"
                      >
                        {savingRequestId === request.id ? 'Updating...' : 'Update request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelRideProgramRequest(request.id)}
                        disabled={cancellingRequestId === request.id}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                      >
                        {cancellingRequestId === request.id ? 'Cancelling...' : 'Cancel request'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      This request cannot be edited because it is {request.status}.
                    </p>
                  )}
                </div>
              );
            })()}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
                    Requested on <DateText value={request.created_at} pattern="PPP p" />
                  </p>
                </div>
                {request.description && (
                  <p className="mb-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {request.description}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {!EXPERTS_BETA_ENABLED && (
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
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={request.preferred_date?.slice(0, 10) || ''}
                      onChange={(event) => {
                        if (EXPERTS_BETA_ENABLED) return;
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
                  {!EXPERTS_BETA_ENABLED && (
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
                  )}
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
        {paidBookings.length > 0 && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
            Great news — you have {paidBookings.length} confirmed paid booking
            {paidBookings.length > 1 ? 's' : ''}.
          </p>
        )}
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
                    <DateText value={event.event_date} pattern="PPP p" />
                    {event.city ? ` • ${event.city}` : ''}
                  </p>
                  {event.sport_type && (
                    <p className="text-xs text-gray-500">
                      Sport: {getSportLabel(event.sport_type)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  View event
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog.Root open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[90vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Edit profile
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>
            {message && (
              <p className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {message}
              </p>
            )}
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Profile photo</label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {editForm.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editForm.profilePhotoUrl} alt="Profile preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{initials}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800">
                      <input type="file" accept="image/*" className="hidden" onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 512, quality: 0.78 });
                          if (dataUrl.length > 350_000) {
                            setMessage('Profile photo is too large. Please choose a smaller image.');
                            return;
                          }
                          setEditForm({ ...editForm, profilePhotoUrl: dataUrl });
                        } catch (uploadError) {
                          console.error(uploadError);
                          setMessage('Unable to process the selected image.');
                        }
                      }} />
                      Upload photo
                    </label>
                    {editForm.profilePhotoUrl && (
                      <button type="button" onClick={() => setEditForm({ ...editForm, profilePhotoUrl: '' })} className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Name</label>
                <input type="text" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">City</label>
                <input type="text" value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Bio</label>
                <textarea value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} className="min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Sports</label>
                <div className="flex flex-wrap gap-2">
                  {sportOptions.map((sport) => {
                    const selected = editForm.sports.split(',').map((value) => value.trim()).filter(Boolean).includes(sport.value);
                    return (
                      <button key={sport.value} type="button" onClick={() => {
                        const current = editForm.sports.split(',').map((value) => value.trim()).filter(Boolean);
                        const updated = selected ? current.filter((value) => value !== sport.value) : [...current, sport.value];
                        setEditForm({ ...editForm, sports: updated.join(', ') });
                      }} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selected ? 'border-green-700 bg-green-700 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'}`}>
                        {sport.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Phone number</label>
                <input type="tel" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="+9779812345678" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">Availability weekdays</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const selected = editForm.availabilityWeekdays.includes(day);
                    return (
                      <button key={day} type="button" onClick={() => setEditForm((prev) => ({ ...prev, availabilityWeekdays: selected ? prev.availabilityWeekdays.filter((value) => value !== day) : [...prev.availabilityWeekdays, day], }))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${selected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                  <input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span>I confirm these profile details are accurate.</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={saving || !acceptTerms} className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {!isProfileComplete && (
        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className={floatingProfileActionButtonClass}
        >
          <span className={profileWarningIconClass}>!</span>
          Complete profile
        </button>
      )}

    </div>
  );
}
