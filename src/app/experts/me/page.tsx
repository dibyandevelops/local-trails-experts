'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Event, EventParticipant, ExpertRideProgram, User, SportType } from '@/types';
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
import ExpertRideNotesPanel from '@/components/experts/expert-ride-notes-panel';

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

type ExpertRideProgramRequest = {
  id: string;
  program_id: string;
  requester_name: string | null;
  requester_email: string;
  requester_phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  group_size: number;
  offered_price_npr: number | null;
  notes: string | null;
  expert_response_note: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  created_at: string;
  program_title: string | null;
  trail_name: string | null;
  trail_slug: string | null;
  trail_location: string | null;
  program_availability_weekdays?: string[] | null;
  expert_availability_weekdays: string[] | null;
};

const PROGRAM_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

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

type RideProgramRequestAction = {
  request: ExpertRideProgramRequest;
  status: ExpertRideProgramRequest['status'];
} | null;

const profileActionButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-emerald-700/70 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/80';

const verificationActionButtonClass =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-amber-500/80 dark:bg-amber-950/80 dark:text-white dark:hover:border-amber-400 dark:hover:bg-amber-900/80';

const floatingVerificationActionButtonClass =
  'fixed bottom-4 right-4 z-40 inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-950 shadow-lg transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-amber-500/80 dark:bg-slate-900 dark:text-white dark:hover:border-amber-400 dark:hover:bg-amber-950/80';

const profileActionIconClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-[10px] font-black leading-none text-white dark:bg-emerald-500 dark:text-slate-950';

const verificationActionIconClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500 text-[10px] font-black leading-none text-white dark:bg-amber-400 dark:text-slate-950';

export default function ExpertProfilePage() {
  const router = useRouter();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<ExpertEventWithParticipants[]>([]);
  const [trailRequests, setTrailRequests] = useState<ExpertTrailRequest[]>([]);
  const [rideProgramRequests, setRideProgramRequests] = useState<ExpertRideProgramRequest[]>([]);
  const [createdTrails, setCreatedTrails] = useState<ExpertTrail[]>([]);
  const [associatedTrails, setAssociatedTrails] = useState<ExpertTrail[]>([]);
  const [availableTrails, setAvailableTrails] = useState<ExpertTrail[]>([]);
  const [ridePrograms, setRidePrograms] = useState<ExpertRideProgram[]>([]);
  const [selectedAssociatedTrailIds, setSelectedAssociatedTrailIds] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTrailRequests, setLoadingTrailRequests] = useState(true);
  const [loadingTrails, setLoadingTrails] = useState(false);
  const [hasLoadedTrails, setHasLoadedTrails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAssociatedTrails, setSavingAssociatedTrails] = useState(false);
  const [savingRideProgram, setSavingRideProgram] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [trailAssociationMessage, setTrailAssociationMessage] = useState<string | null>(null);
  const [rideProgramMessage, setRideProgramMessage] = useState<string | null>(null);
  const [rideProgramRequestMessage, setRideProgramRequestMessage] = useState<string | null>(null);
  const [updatingRideProgramRequestId, setUpdatingRideProgramRequestId] = useState<string | null>(null);
  const [rideProgramRequestAction, setRideProgramRequestAction] =
    useState<RideProgramRequestAction>(null);
  const [rideProgramResponseNote, setRideProgramResponseNote] = useState('');
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
  const [rideProgramModalOpen, setRideProgramModalOpen] = useState(false);
  const [associatedTrailsModalOpen, setAssociatedTrailsModalOpen] = useState(false);
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
  const [rideProgramForm, setRideProgramForm] = useState({
    trailId: '',
    description: '',
    priceNpr: '',
    maxGroupSize: '4',
    durationNote: '',
    meetingPointNote: '',
    availabilityWeekdays: [] as string[],
    availableTimeNote: '',
    skillLevel: 'intermediate',
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
  const pendingRideProgramRequests = useMemo(
    () => rideProgramRequests.filter((request) => request.status === 'pending'),
    [rideProgramRequests]
  );
  const activeRidePrograms = useMemo(
    () => ridePrograms.filter((program) => program.is_active),
    [ridePrograms]
  );
  const pausedRidePrograms = ridePrograms.length - activeRidePrograms.length;
  const sortedAvailableTrails = useMemo(() => {
    const savedAssociated = new Set(associatedTrails.map((trail) => trail.id));
    return [...availableTrails].sort((a, b) => {
      const aSaved = savedAssociated.has(a.id);
      const bSaved = savedAssociated.has(b.id);
      if (aSaved !== bSaved) return aSaved ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [associatedTrails, availableTrails]);

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

        const [eventsRes, requestsRes, programsRes, programRequestsRes] = await Promise.all([
          fetch(`/api/experts/${currentUser.id}/events`),
          fetch('/api/experts/me/alerts'),
          fetch('/api/experts/me/ride-programs'),
          fetch('/api/experts/me/ride-program-requests'),
        ]);
        const eventsData = await eventsRes.json();
        const requestsData = await requestsRes.json();
        const programsData = await programsRes.json();
        const programRequestsData = await programRequestsRes.json();
        setEvents(eventsData.events || []);
        setTrailRequests(requestsData.requests || []);
        setRidePrograms(programsData.programs || []);
        setRideProgramRequests(programRequestsData.requests || []);
      } catch (error) {
        console.error('Error loading expert profile', error);
      } finally {
        setLoadingEvents(false);
        setLoadingTrailRequests(false);
      }
    };

    fetchEventsAndRequests();
  }, [currentUser]);

  const loadExpertTrails = async (force = false) => {
    if (!currentUser || currentUser.role !== 'expert') return;
    if (hasLoadedTrails && !force) return;
    setLoadingTrails(true);
    setTrailAssociationMessage(null);
    try {
      const response = await fetch('/api/experts/me/trails');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load expert trails');
      }
      setCreatedTrails(data.created_trails || data.trails || []);
      setAssociatedTrails(data.associated_trails || []);
      setAvailableTrails(data.available_trails || []);
      setSelectedAssociatedTrailIds(
        (data.associated_trails || []).map((trail: ExpertTrail) => trail.id)
      );
      setHasLoadedTrails(true);
    } catch (error) {
      setTrailAssociationMessage(
        error instanceof Error ? error.message : 'Failed to load expert trails.'
      );
    } finally {
      setLoadingTrails(false);
    }
  };

  useEffect(() => {
    if (associatedTrailsModalOpen || rideProgramModalOpen) {
      void loadExpertTrails();
    }
  }, [associatedTrailsModalOpen, rideProgramModalOpen]);

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
      setHasLoadedTrails(true);
      setTrailAssociationMessage('Associated trails updated.');
      setAssociatedTrailsModalOpen(false);
    } catch (error) {
      setTrailAssociationMessage(
        error instanceof Error ? error.message : 'Failed to update associated trails.'
      );
    } finally {
      setSavingAssociatedTrails(false);
    }
  };

  const saveRideProgram = async () => {
    setSavingRideProgram(true);
    setRideProgramMessage(null);
    try {
      if (!rideProgramForm.trailId) {
        throw new Error('Select one of your associated trails first.');
      }

      const response = await fetch('/api/experts/me/ride-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: rideProgramForm.trailId,
          description: rideProgramForm.description.trim() || null,
          price_npr: rideProgramForm.priceNpr ? Number(rideProgramForm.priceNpr) : null,
          max_group_size: rideProgramForm.maxGroupSize ? Number(rideProgramForm.maxGroupSize) : 4,
          duration_note: rideProgramForm.durationNote.trim() || null,
          meeting_point_note: rideProgramForm.meetingPointNote.trim() || null,
          availability_weekdays: rideProgramForm.availabilityWeekdays,
          available_time_note: rideProgramForm.availableTimeNote.trim() || null,
          skill_level: rideProgramForm.skillLevel,
          is_active: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save ride program');
      }
      setRidePrograms(data.programs || []);
      setRideProgramForm((prev) => ({
        ...prev,
        trailId: '',
        description: '',
        priceNpr: '',
        durationNote: '',
        meetingPointNote: '',
        availabilityWeekdays: [],
        availableTimeNote: '',
      }));
      setRideProgramMessage('Ride program saved.');
      setRideProgramModalOpen(false);
    } catch (error) {
      setRideProgramMessage(
        error instanceof Error ? error.message : 'Failed to save ride program.'
      );
    } finally {
      setSavingRideProgram(false);
    }
  };

  const toggleRideProgramActive = async (programId: string, isActive: boolean) => {
    setRideProgramMessage(null);
    try {
      const response = await fetch('/api/experts/me/ride-programs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: programId, is_active: isActive }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update ride program');
      }
      setRidePrograms(data.programs || []);
      setRideProgramMessage(isActive ? 'Ride program is live.' : 'Ride program is paused.');
    } catch (error) {
      setRideProgramMessage(
        error instanceof Error ? error.message : 'Failed to update ride program.'
      );
    }
  };

  const updateRideProgramRequestStatus = async (
    requestId: string,
    status: ExpertRideProgramRequest['status'],
    responseNote = ''
  ) => {
    setRideProgramRequestMessage(null);
    setUpdatingRideProgramRequestId(requestId);
    try {
      const response = await fetch('/api/experts/me/ride-program-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status,
          expert_response_note: responseNote.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update ride request');
      }
      setRideProgramRequests((prev) =>
        prev.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status,
                expert_response_note: responseNote.trim() || null,
              }
            : request
        )
      );
      setRideProgramRequestMessage(`Ride request marked ${status}.`);
      return true;
    } catch (error) {
      setRideProgramRequestMessage(
        error instanceof Error ? error.message : 'Failed to update ride request.'
      );
      return false;
    } finally {
      setUpdatingRideProgramRequestId(null);
    }
  };

  const openRideProgramRequestAction = (
    request: ExpertRideProgramRequest,
    status: ExpertRideProgramRequest['status']
  ) => {
    setRideProgramRequestAction({ request, status });
    setRideProgramResponseNote(request.expert_response_note || '');
    setRideProgramRequestMessage(null);
  };

  const closeRideProgramRequestAction = () => {
    setRideProgramRequestAction(null);
    setRideProgramResponseNote('');
  };

  const confirmRideProgramRequestAction = async () => {
    if (!rideProgramRequestAction) return;
    const updated = await updateRideProgramRequestStatus(
      rideProgramRequestAction.request.id,
      rideProgramRequestAction.status,
      rideProgramResponseNote
    );
    if (updated) {
      closeRideProgramRequestAction();
    }
  };

  if (loadingUser || loadingEvents || loadingTrailRequests) {
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
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-100 dark:border-slate-700 dark:bg-slate-800">
                {editForm.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editForm.profilePhotoUrl}
                    alt={editForm.name || 'Expert profile'}
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
                    {editForm.name || 'Expert profile'}
                  </h2>
                  {user.is_verified_expert ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      Verified Expert
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      Pending Verification
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {editForm.city || 'City not added'} · {selectedSports.length > 0 ? selectedSports.map((sport) => getSportLabel(sport as SportType)).join(', ') : 'Sports not added'}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 dark:text-slate-200">
                  {editForm.bio?.trim() || 'Add a short bio so riders understand your trail knowledge, riding style, and experience.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className={profileActionButtonClass}
              >
                <span className={profileActionIconClass}>E</span>
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => setVerificationModalOpen(true)}
                className={verificationActionButtonClass}
              >
                <span className={verificationActionIconClass}>!</span>
                Update verification
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {message && (
            <p
              className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
                message.toLowerCase().includes('select at least one sport') ||
                message.toLowerCase().includes('accept the terms')
                  ? 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                  : 'border-green-100 bg-green-50 text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
              }`}
            >
              {message}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Email</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{user.email || 'Not added'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Phone</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">{editForm.phone || 'Not added'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Google Login</p>
              {user.google_sub ? (
                <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                  Connected
                </span>
              ) : (
                <Link
                  href={`/api/auth/google/start?mode=connect&next=${encodeURIComponent('/experts/me')}`}
                  className="mt-1 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                >
                  Connect Google
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {STRAVA_ENABLED && (
              stravaSummary?.connected ? (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
                  Strava Connected
                </span>
              ) : (
                <Link
                  href={`${ApiPath.StravaAuthorize}?mode=connect`}
                  className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/50"
                >
                  Connect with Strava
                </Link>
              )
            )}
            {stravaSummary?.syncedAt && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Last synced <DateText value={stravaSummary.syncedAt} pattern="PPP p" />
              </span>
            )}
            {stravaSummary?.connected && stravaSummary?.profile?.id && (
              <a
                href={`https://www.strava.com/athletes/${stravaSummary.profile.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-orange-700 underline decoration-orange-400 dark:text-orange-200"
              >
                View on Strava
              </a>
            )}
            {!user.is_verified_expert && (
              <button
                type="button"
                onClick={() => setVerificationModalOpen(true)}
                className={verificationActionButtonClass}
              >
                <span className={verificationActionIconClass}>!</span>
                Complete verification details
              </button>
            )}
          </div>

          {googleNotice && (
            <p className="mt-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {googleNotice}
            </p>
          )}
          {!user.google_sub && (
            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              For security, the Google email must match your expert account email.
            </p>
          )}
        </div>
      </section>

      <section id="associated-trails" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trails Associated With You
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Pin public trails you guide, ride, or know well. Open the picker only when you need to update them.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {associatedTrails.length > 0 ? (
                associatedTrails.slice(0, 6).map((trail) => (
                  <Link
                    key={`associated-summary-${trail.id}`}
                    href={`/trails/${trail.slug || trail.id}`}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100"
                  >
                    {trail.name}
                  </Link>
                ))
              ) : (
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {hasLoadedTrails ? 'No associated trails selected yet.' : 'Open the picker to load available trails.'}
                </span>
              )}
              {associatedTrails.length > 6 && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  +{associatedTrails.length - 6} more
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
              {selectedAssociatedTrailIds.length}/12 selected
            </span>
            <button
              type="button"
              onClick={() => setAssociatedTrailsModalOpen(true)}
              className={profileActionButtonClass}
            >
              <span className={profileActionIconClass}>T</span>
              Manage associated trails
            </button>
          </div>
        </div>
        {trailAssociationMessage && !associatedTrailsModalOpen && (
          <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100">
            {trailAssociationMessage}
          </p>
        )}
      </section>

      <ExpertRideNotesPanel />

      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800 dark:border-slate-600 dark:bg-slate-800 dark:text-emerald-200">
                Ride with Experts
              </span>
              <h2 className="mt-3 text-2xl font-black text-gray-950 dark:text-white">
                Manage ride programs and participant requests
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-slate-300">
                Create requestable rides from trails associated with your expert profile, review participant
                requests, and pause or publish offers from one place.
              </p>
            </div>
            <Link
              href="/ride-with-experts"
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-emerald-500"
            >
              View public page
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Pending requests</p>
              <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{pendingRideProgramRequests.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Live programs</p>
              <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{activeRidePrograms.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Associated trails</p>
              <p className="mt-1 text-2xl font-black text-gray-950 dark:text-white">{associatedTrails.length}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          {(rideProgramMessage || rideProgramRequestMessage) && (
            <div className="space-y-2">
              {rideProgramMessage && (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100">
                  {rideProgramMessage}
                </p>
              )}
              {rideProgramRequestMessage && (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100">
                  {rideProgramRequestMessage}
                </p>
              )}
            </div>
          )}

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-950 dark:text-white">Create a ride program</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                      Keep creation separate from request review. Open the form when you are ready to publish a new ride offer.
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                      Public title is generated as Ride with {editForm.name || 'you'} to the selected trail.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRideProgramModalOpen(true)}
                    disabled={loadingTrails || (hasLoadedTrails && associatedTrails.length === 0)}
                    className={`${profileActionButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className={profileActionIconClass}>+</span>
                    {loadingTrails ? 'Loading trails...' : 'New ride program'}
                  </button>
                </div>
                {associatedTrails.length === 0 && (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Associate at least one trail before creating ride programs. Use the associated trails section below.
                  </div>
                )}
              </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">Incoming ride requests</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    Accept, decline, or complete participant requests with an optional response note.
                  </p>
                </div>
                {rideProgramRequests.length > 0 && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-slate-800 dark:text-emerald-200">
                    {rideProgramRequests.length} total
                  </span>
                )}
              </div>

              {rideProgramRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No ride requests yet. When participants request your public programs, they will appear here.
                </div>
              ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {rideProgramRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-gray-950 dark:text-slate-100">
                              {request.program_title || request.trail_name || 'Ride request'}
                            </p>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {request.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            {request.trail_location || 'Trail location not set'}
                            {request.program_availability_weekdays?.length
                              ? ` · Program availability: ${request.program_availability_weekdays.join(', ')}`
                              : request.expert_availability_weekdays?.length
                                ? ` · Profile availability: ${request.expert_availability_weekdays.join(', ')}`
                              : ' · Flexible availability'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          <DateText value={request.created_at} pattern="PP" />
                        </p>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-gray-600 dark:text-slate-300 sm:grid-cols-2">
                        <p>Participant: {request.requester_name || 'Participant'}</p>
                        <p>Preferred: {request.preferred_date}{request.preferred_time ? ` at ${request.preferred_time}` : ''}</p>
                        <p>Group size: {request.group_size}</p>
                        <p>Offer: {request.offered_price_npr ? `NPR ${request.offered_price_npr}` : 'Not added'}</p>
                        {request.requester_phone && <p>Phone: {request.requester_phone}</p>}
                        <p className="truncate">Email: {request.requester_email}</p>
                      </div>

                      {request.notes && (
                        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                          {request.notes}
                        </p>
                      )}
                      {request.expert_response_note && (
                        <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100">
                          Expert note: {request.expert_response_note}
                        </p>
                      )}

                      {['pending', 'accepted'].includes(request.status) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {request.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => openRideProgramRequestAction(request, 'accepted')}
                              disabled={updatingRideProgramRequestId === request.id}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                            >
                              Accept
                            </button>
                          )}
                          {request.status === 'accepted' && (
                            <button
                              type="button"
                              onClick={() => openRideProgramRequestAction(request, 'completed')}
                              disabled={updatingRideProgramRequestId === request.id}
                              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
                            >
                              Mark completed
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openRideProgramRequestAction(request, 'declined')}
                            disabled={updatingRideProgramRequestId === request.id}
                            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">Your ride programs</h3>
                  {pausedRidePrograms > 0 && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {pausedRidePrograms} paused
                    </span>
                  )}
                </div>

                {ridePrograms.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    No ride programs created yet.
                  </p>
                ) : (
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {ridePrograms.map((program) => (
                      <div
                        key={program.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-gray-950 dark:text-slate-100">
                                {program.title}
                              </h4>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  program.is_active
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {program.is_active ? 'Live' : 'Paused'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              {program.trail_location || 'Trail location not set'}
                              {program.price_npr ? ` · NPR ${program.price_npr}` : ''}
                              {program.max_group_size ? ` · Up to ${program.max_group_size} riders` : ''}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              Availability:{' '}
                              {program.availability_weekdays?.length
                                ? program.availability_weekdays.join(', ')
                                : 'Inherits profile availability'}
                              {program.available_time_note ? ` · ${program.available_time_note}` : ''}
                            </p>
                            {program.description && (
                              <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                                {program.description}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRideProgramActive(program.id, !program.is_active)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            {program.is_active ? 'Pause' : 'Make live'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Trails You Created
        </h2>
        {!hasLoadedTrails ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <span>Trail data loads when you manage associated trails.</span>
            <button
              type="button"
              onClick={() => setAssociatedTrailsModalOpen(true)}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-slate-800"
            >
              Load trails
            </button>
          </div>
        ) : createdTrails.length === 0 ? (
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

      <Dialog.Root open={associatedTrailsModalOpen} onOpenChange={setAssociatedTrailsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[94vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-slate-800">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Manage associated trails
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Select public trails you guide, ride, or know well. These appear on your public expert profile.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>

            <div className="max-h-[calc(88vh-82px)] overflow-y-auto p-5">
              {loadingTrails ? (
                <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  Loading trails...
                </div>
              ) : (
                <>
                  {trailAssociationMessage && (
                    <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100">
                      {trailAssociationMessage}
                    </p>
                  )}

                  {associatedTrails.length > 0 && (
                    <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        Currently shown on profile
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {associatedTrails.map((trail) => (
                          <Link
                            key={`associated-${trail.id}`}
                            href={`/trails/${trail.slug || trail.id}`}
                            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-100"
                          >
                            {trail.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTrails.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      No approved visible trails are available to associate yet.
                    </p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-800">
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

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-slate-800">
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                      {selectedAssociatedTrailIds.length}/12 selected
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAssociatedTrailsModalOpen(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveAssociatedTrails}
                        disabled={savingAssociatedTrails}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingAssociatedTrails ? 'Saving...' : 'Save associated trails'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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

      <Dialog.Root open={rideProgramModalOpen} onOpenChange={setRideProgramModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-gray-200 pb-3 dark:border-slate-800">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Create ride program
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Create a requestable ride from one of your associated trails.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>

            {loadingTrails ? (
              <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Loading associated trails...
              </div>
            ) : associatedTrails.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Associate at least one trail before creating a ride program.
              </div>
            ) : (
              <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Associated trail
                <select
                  value={rideProgramForm.trailId}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, trailId: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Select trail</option>
                  {associatedTrails.map((trail) => (
                    <option key={trail.id} value={trail.id}>
                      {trail.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Skill level
                <select
                  value={rideProgramForm.skillLevel}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, skillLevel: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Max group size
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={rideProgramForm.maxGroupSize}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, maxGroupSize: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Price in NPR
                <input
                  type="number"
                  min={0}
                  value={rideProgramForm.priceNpr}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, priceNpr: event.target.value }))
                  }
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Duration note
                <input
                  value={rideProgramForm.durationNote}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, durationNote: event.target.value }))
                  }
                  placeholder="2-3 hours, half day, etc."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Meeting point note
                <input
                  value={rideProgramForm.meetingPointNote}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, meetingPointNote: event.target.value }))
                  }
                  placeholder="Coordinate after request, shop pickup, etc."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Time note
                <input
                  value={rideProgramForm.availableTimeNote}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, availableTimeNote: event.target.value }))
                  }
                  placeholder="Morning only, after 7 AM, weekends before noon, etc."
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Available weekdays</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Leave empty to inherit your profile availability.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PROGRAM_WEEKDAYS.map((day) => {
                    const selected = rideProgramForm.availabilityWeekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setRideProgramForm((prev) => ({
                            ...prev,
                            availabilityWeekdays: selected
                              ? prev.availabilityWeekdays.filter((item) => item !== day)
                              : [...prev.availabilityWeekdays, day],
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          selected
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-slate-200 md:col-span-2">
                Short description
                <textarea
                  rows={4}
                  value={rideProgramForm.description}
                  onChange={(event) =>
                    setRideProgramForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="What makes this ride worth requesting?"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>

              </>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-slate-800">
              <Dialog.Close className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Cancel
              </Dialog.Close>
              <button
                type="button"
                onClick={saveRideProgram}
                disabled={savingRideProgram || loadingTrails || associatedTrails.length === 0}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingRideProgram ? 'Saving...' : 'Save ride program'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(rideProgramRequestAction)}
        onOpenChange={(open) => {
          if (!open) closeRideProgramRequestAction();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            {rideProgramRequestAction && (() => {
              const { request, status } = rideProgramRequestAction;
              const actionLabel =
                status === 'accepted'
                  ? 'Accept ride request'
                  : status === 'declined'
                    ? 'Decline ride request'
                    : status === 'completed'
                      ? 'Complete ride request'
                      : 'Update ride request';
              const placeholder =
                status === 'accepted'
                  ? 'Meeting point, timing, contact instruction, or what the participant should prepare.'
                  : status === 'declined'
                    ? 'Short reason or alternate suggestion.'
                    : status === 'completed'
                      ? 'Optional closing note or follow-up.'
                      : 'Optional response note.';

              return (
                <div>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                        {actionLabel}
                      </Dialog.Title>
                      <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                        Add an optional note. The participant will see it and receive it in the notification.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                      Close
                    </Dialog.Close>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {request.program_title || request.trail_name || 'Ride request'}
                    </p>
                    <p className="mt-1">
                      Participant: {request.requester_name || 'Participant'} ({request.requester_email})
                    </p>
                    <p className="mt-1">
                      Preferred: {request.preferred_date}
                      {request.preferred_time ? ' at ' + request.preferred_time : ''}
                    </p>
                    <p className="mt-1">Group size: {request.group_size}</p>
                    {request.notes && (
                      <p className="mt-2 rounded-lg bg-white px-3 py-2 dark:bg-slate-950">
                        Participant note: {request.notes}
                      </p>
                    )}
                  </div>

                  <label className="mt-4 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Response note
                    <textarea
                      rows={4}
                      value={rideProgramResponseNote}
                      onChange={(event) => setRideProgramResponseNote(event.target.value)}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeRideProgramRequestAction}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmRideProgramRequestAction}
                      disabled={updatingRideProgramRequestId === request.id}
                      className={
                        status === 'declined'
                          ? 'rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60'
                          : 'rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60'
                      }
                    >
                      {updatingRideProgramRequestId === request.id ? 'Saving...' : actionLabel}
                    </button>
                  </div>
                </div>
              );
            })()}
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
          className={floatingVerificationActionButtonClass}
        >
          <span className={verificationActionIconClass}>!</span>
          Complete verification
        </button>
      )}
    </div>
  );
}
