'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Event, EventParticipant, User, SportType } from '@/types';
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
import { STRAVA_ENABLED } from '@/lib/feature-flags';
import DateText from '@/components/ui/date-text';

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
  slug?: string | null;
  name: string;
  location: string | null;
  sport_type: string | null;
  difficulty: string | null;
  created_at: string;
  is_hidden: boolean;
  sort_order?: number | null;
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
  const [associatedTrails, setAssociatedTrails] = useState<ExpertTrail[]>([]);
  const [availableTrails, setAvailableTrails] = useState<ExpertTrail[]>([]);
  const [selectedAssociatedTrailIds, setSelectedAssociatedTrailIds] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTrailRequests, setLoadingTrailRequests] = useState(true);
  const [loadingTrails, setLoadingTrails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAssociatedTrails, setSavingAssociatedTrails] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [trailAssociationMessage, setTrailAssociationMessage] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [requestForEvent, setRequestForEvent] = useState<ExpertTrailRequest | null>(
    null
  );
  const [hidingTrailId, setHidingTrailId] = useState<string | null>(null);
  const [unhidingTrailId, setUnhidingTrailId] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [verificationSaving, setVerificationSaving] = useState(false);
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
    verificationAchievements: '',
    verificationStravaUrl: '',
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
  const selectedSports = editForm.sports
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const sortedAvailableTrails = useMemo(() => {
    const selected = new Set(selectedAssociatedTrailIds);
    return [...availableTrails].sort((a, b) => {
      const aSelected = selected.has(a.id);
      const bSelected = selected.has(b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableTrails, selectedAssociatedTrailIds]);

  const sportOptions: { value: SportType; label: string }[] = TRAIL_SPORTS;
  const { data: stravaSummary } = useQuery({
    queryKey: QUERY_KEYS.experts.strava(currentUser?.id),
    queryFn: ({ signal }) => fetchExpertStravaSummary(currentUser?.id || '', signal),
    enabled: STRAVA_ENABLED && !!currentUser?.id && currentUser.role === 'expert',
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
        verificationAchievements: currentUser.verification_achievements || '',
        verificationStravaUrl: currentUser.verification_strava_url || '',
        verificationLinks: currentUser.verification_links || '',
      });
    }
  }, [currentUser]);

  const saveVerificationDetails = async () => {
    setVerificationSaving(true);
    setMessage(null);
    try {
      const stravaUrl = editForm.verificationStravaUrl.trim();
      if (stravaUrl) {
        const isValidStravaUrl = /^https?:\/\/(www\.)?strava\.com\/.+/i.test(stravaUrl);
        if (!isValidStravaUrl) {
          setMessage('Please enter a valid Strava URL (https://www.strava.com/...).');
          setVerificationSaving(false);
          return;
        }
      }
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_years_experience: editForm.verificationYearsExperience || null,
          verification_certifications: editForm.verificationCertifications || null,
          verification_guiding_history: editForm.verificationGuidingHistory || null,
          verification_safety_training: editForm.verificationSafetyTraining || null,
          verification_achievements: editForm.verificationAchievements || null,
          verification_strava_url: stravaUrl || null,
          verification_links: editForm.verificationLinks || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit verification details');
      }
      setUser(data.user);
      setMessage('Verification details submitted. We will review and update your status.');
      setVerificationModalOpen(false);
    } catch (error) {
      console.error('Error submitting verification details', error);
      setMessage('Unable to submit verification details.');
    } finally {
      setVerificationSaving(false);
    }
  };

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
        setCreatedTrails(trailsData.created_trails || trailsData.trails || []);
        setAssociatedTrails(trailsData.associated_trails || []);
        setAvailableTrails(trailsData.available_trails || []);
        setSelectedAssociatedTrailIds(
          (trailsData.associated_trails || []).map((trail: ExpertTrail) => trail.id)
        );
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

  const toggleAssociatedTrail = (trailId: string) => {
    setTrailAssociationMessage(null);
    setSelectedAssociatedTrailIds((prev) => {
      if (prev.includes(trailId)) {
        return prev.filter((id) => id !== trailId);
      }
      if (prev.length >= 12) {
        setTrailAssociationMessage('You can associate up to 12 trails.');
        return prev;
      }
      return [...prev, trailId];
    });
  };

  const saveAssociatedTrails = async () => {
    setSavingAssociatedTrails(true);
    setTrailAssociationMessage(null);
    try {
      const response = await fetch('/api/experts/me/trails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trail_ids: selectedAssociatedTrailIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update associated trails');
      }
      setAssociatedTrails(data.associated_trails || []);
      setSelectedAssociatedTrailIds(
        (data.associated_trails || []).map((trail: ExpertTrail) => trail.id)
      );
      setTrailAssociationMessage('Associated trails updated.');
    } catch (error) {
      setTrailAssociationMessage(
        error instanceof Error ? error.message : 'Failed to update associated trails.'
      );
    } finally {
      setSavingAssociatedTrails(false);
    }
  };

  if (loadingUser || loadingEvents || loadingTrailRequests || loadingTrails) {
    return <div className="text-gray-600 dark:text-slate-300">Loading profile...</div>;
  }

  if (!user || user.role !== 'expert') {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        You must be logged in as an expert to view this page.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Expert Profile
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Settings
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Manage your expert presence
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Keep your profile, verification details, and trail activity up to date.
          </p>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Google Login
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Connect your Google account to enable one-tap login
            </p>
          </div>
          {user.google_sub ? (
            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              Connected
            </span>
          ) : (
            <Link
              href={`/api/auth/google/start?mode=connect&next=${encodeURIComponent('/experts/me')}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Connect Google
            </Link>
          )}
        </div>
        {googleNotice && (
          <p className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {googleNotice}
          </p>
        )}
        {!user.google_sub && (
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            For security, the Google email must match your expert account email.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Profile Details</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Keep your public expert information and verification details updated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={() => setVerificationModalOpen(true)}
              className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              Update verification
            </button>
          </div>
        </div>
        {STRAVA_ENABLED && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {stravaSummary?.connected ? (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
                  Strava Connected
                </span>
              ) : (
                <Link
                  href={`${ApiPath.StravaAuthorize}?mode=connect`}
                  className="inline-flex items-center rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/50"
                >
                  Connect with Strava
                </Link>
              )}
              {stravaSummary?.syncedAt && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Last synced <DateText value={stravaSummary.syncedAt} pattern="PPP p" />
                </span>
              )}
            </div>
            {stravaSummary?.connected && (
              <div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-orange-700 dark:text-orange-200">
                {stravaSummary?.profile?.id && (
                  <a
                    href={`https://www.strava.com/athletes/${stravaSummary.profile.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-orange-700 underline decoration-orange-400 dark:text-orange-200"
                  >
                    View on Strava
                  </a>
                )}
                <span className="uppercase tracking-wide">Powered by Strava</span>
              </div>
            )}
          </>
        )}
        {user.is_verified_expert ? (
          <span className="mb-4 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Verified Expert
          </span>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              Pending Verification
            </span>
            <button
              type="button"
              onClick={() => setVerificationModalOpen(true)}
              className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
            >
              Complete verification details
            </button>
          </div>
        )}
        {message && (
          <p
            className={`text-sm border rounded-lg px-3 py-2 mb-3 ${
              message.toLowerCase().includes('select at least one sport') ||
              message.toLowerCase().includes('accept the terms')
                ? 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                : 'border-green-100 bg-green-50 text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            {message}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Full name</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{editForm.name || 'Not added'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Email</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{user.email || 'Not added'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Phone</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{editForm.phone || 'Not added'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">City</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{editForm.city || 'Not added'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Sports</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
              {selectedSports.length > 0
                ? selectedSports.map((sport) => getSportLabel(sport as SportType)).join(', ')
                : 'Not added'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Bio</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-slate-100">{editForm.bio?.trim() || 'Not added'}</p>
          </div>
        </div>
      </section>

      <section id="trail-requests" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Requested Trails For You
          </h2>
          {trailRequests.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              {trailRequests.length} alert{trailRequests.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {trailRequests.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">No trail requests assigned to you.</p>
        ) : (
          <div className="space-y-3">
            {trailRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {request.trail_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {request.trail_location || 'Unknown location'}
                      {request.trail_sport_type
                        ? ` • ${getSportLabel(request.trail_sport_type)}`
                        : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Requested <DateText value={request.created_at} pattern="PPP p" />
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">
                  Participant: {request.requester_name || 'Participant'} ({request.requester_email})
                </p>
                {request.preferred_date && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                    Preferred date: {request.preferred_date.slice(0, 10)}
                  </p>
                )}
                {request.description && (
                  <p className="mt-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-200">
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
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
                  >
                    Create Event For This Participant
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Events You Host
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            You have not created any events yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-950 dark:text-slate-400">
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
                    <tr key={event.id} className="border-t border-gray-200 align-top dark:border-slate-800">
                      <td className="px-3 py-3">
                        <Link
                          href={`/events/${event.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-green-700 dark:text-slate-100 dark:hover:text-emerald-300"
                        >
                          {event.title}
                        </Link>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {event.city ? event.city : '—'}
                        </div>
                        {event.sport_type && (
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {getSportLabel(event.sport_type)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                        <DateText value={event.event_date} pattern="PPP p" />
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                        {participants.length === 0 ? (
                          <span className="text-gray-400 dark:text-slate-500">No participants yet</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                              {participants.length} joined
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setParticipantsEventTitle(event.title);
                                setParticipantsList(participants);
                                setParticipantsModalOpen(true);
                              }}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
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
                          className="text-xs font-semibold text-green-700 hover:text-green-800 dark:text-emerald-300 dark:hover:text-emerald-200"
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

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trails Associated With You
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Pin public trails you guide, ride, or know well. These appear on your public expert profile.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            {selectedAssociatedTrailIds.length}/12 selected
          </span>
        </div>

        {associatedTrails.length > 0 && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Currently shown on profile
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {associatedTrails.map((trail) => (
                <Link
                  key={`associated-${trail.id}`}
                  href={`/trails/${trail.slug || trail.id}`}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                >
                  {trail.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {availableTrails.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            No approved visible trails are available to associate yet.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Trail</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Sport</th>
                </tr>
              </thead>
              <tbody>
                {sortedAvailableTrails.map((trail) => {
                  const checked = selectedAssociatedTrailIds.includes(trail.id);
                  return (
                    <tr key={`available-${trail.id}`} className="border-t border-gray-200 dark:border-slate-800">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAssociatedTrail(trail.id)}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                          aria-label={`Associate ${trail.name}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/trails/${trail.slug || trail.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-green-700 dark:text-slate-100 dark:hover:text-emerald-300"
                        >
                          {trail.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                        {trail.location || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                        {trail.sport_type ? getSportLabel(trail.sport_type as SportType) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAssociatedTrails}
            disabled={savingAssociatedTrails}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingAssociatedTrails ? 'Saving...' : 'Save associated trails'}
          </button>
          {trailAssociationMessage && (
            <p className="text-sm text-gray-600 dark:text-slate-300">{trailAssociationMessage}</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Trails You Created
        </h2>
        {createdTrails.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-300">
            You have not created any trails yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-950 dark:text-slate-400">
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
                  <tr key={trail.id} className="border-t border-gray-200 dark:border-slate-800">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/trails/${trail.slug || trail.id}`)}
                        className="text-sm font-semibold text-gray-900 hover:text-green-700 dark:text-slate-100 dark:hover:text-emerald-300"
                      >
                        {trail.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                      {trail.location || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                      {trail.sport_type ? getSportLabel(trail.sport_type) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
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
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50"
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
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                          disabled={unhidingTrailId === trail.id}
                        >
                          {unhidingTrailId === trail.id ? 'Unhiding...' : 'Unhide'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/upload?trailId=${trail.id}`)}
                        className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
              <Dialog.Title className="truncate pr-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                Create Event For Requested Trail
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
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
              <div className="grid h-[calc(88vh-52px)] place-items-center text-sm text-gray-600 dark:text-slate-300">
                Select a request to create event.
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-slate-800">
              <Dialog.Title className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Edit expert profile
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setSaving(true);
                setMessage(null);
                try {
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
                      phone: editForm.phone,
                      profile_photo_url: editForm.profilePhotoUrl || null,
                    }),
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    throw new Error(data?.error || 'Failed to update profile');
                  }
                  setUser(data.user);
                  setMessage('Profile updated.');
                  setProfileModalOpen(false);
                  setAcceptTerms(false);
                } catch (error) {
                  console.error('Error updating profile', error);
                  setMessage('Unable to update profile.');
                } finally {
                  setSaving(false);
                }
              }}
              className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800">
                  {editForm.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editForm.profilePhotoUrl}
                      alt="Expert profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500 dark:text-slate-300">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Profile photo</label>
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
                    className="block w-full text-sm text-gray-700 dark:text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(event) => setEditForm({ ...editForm, city: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Bio</label>
                <textarea
                  id="expert-bio"
                  value={editForm.bio}
                  onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })}
                  ref={bioRef}
                  placeholder="Tell about yourself."
                  className="min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Sports</label>
                <div className="flex flex-wrap gap-2">
                  {sportOptions.map((sport) => {
                    const selected = selectedSports.includes(sport.value);
                    return (
                      <button
                        key={sport.value}
                        type="button"
                        onClick={() => {
                          const updated = selected
                            ? selectedSports.filter((value) => value !== sport.value)
                            : [...selectedSports, sport.value];
                          setEditForm({ ...editForm, sports: updated.join(', ') });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          selected
                            ? 'bg-green-700 text-white border-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500'
                        }`}
                      >
                        {sport.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Phone number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="+9779812345678"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>I confirm these profile details are accurate.</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving || !acceptTerms}
                  className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={participantsModalOpen} onOpenChange={setParticipantsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
              <Dialog.Title className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Participants · {participantsEventTitle}
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {participantsList.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-slate-300">No participants yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-950 dark:text-slate-400">
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
                      <tr key={participant.id} className="border-t border-gray-200 dark:border-slate-800">
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {participant.participant_name}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-slate-300">
                          {participant.participant_email}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-slate-300">
                          {participant.phone || '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-slate-300">
                          {participant.expertise_level}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-slate-300">
                          <DateText value={participant.joined_at} pattern="PP" />
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

      <Dialog.Root open={verificationModalOpen} onOpenChange={setVerificationModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-slate-800">
              <Dialog.Title className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Expert verification details
              </Dialog.Title>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>
            <p className="mt-3 text-xs text-gray-600 dark:text-slate-300">
              Share clear experience and safety details so admin can review your verification faster.
            </p>
            <div className="mt-3">
              <VerificationDetailsForm
                values={{
                  yearsExperience: editForm.verificationYearsExperience,
                  certifications: editForm.verificationCertifications,
                  guidingHistory: editForm.verificationGuidingHistory,
                  safetyTraining: editForm.verificationSafetyTraining,
                  achievements: editForm.verificationAchievements,
                  stravaUrl: editForm.verificationStravaUrl,
                  links: editForm.verificationLinks,
                }}
                onChange={(next) =>
                  setEditForm({
                    ...editForm,
                    verificationYearsExperience: next.yearsExperience,
                    verificationCertifications: next.certifications,
                    verificationGuidingHistory: next.guidingHistory,
                    verificationSafetyTraining: next.safetyTraining,
                    verificationAchievements: next.achievements,
                    verificationStravaUrl: next.stravaUrl,
                    verificationLinks: next.links,
                  })
                }
                containerClassName="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                labelClassName="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-200"
                inputClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                textareaClassName="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                titleClassName="text-sm font-semibold text-gray-900 dark:text-slate-100"
                descriptionClassName="mb-3 mt-1 text-xs text-gray-500 dark:text-slate-400"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVerificationModalOpen(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveVerificationDetails}
                disabled={verificationSaving}
                className="rounded bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {verificationSaving ? 'Submitting...' : 'Submit verification details'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {!user.is_verified_expert && (
        <button
          type="button"
          onClick={() => setVerificationModalOpen(true)}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-amber-600"
        >
          Complete verification
        </button>
      )}
    </div>
  );
}
