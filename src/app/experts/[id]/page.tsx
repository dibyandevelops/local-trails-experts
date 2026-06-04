'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Event, User, ExpertReview } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchExpertEvents,
  fetchExperts,
  fetchExpertStravaSummary,
} from '@/services/experts/experts.service';
import { getSportLabel } from '@/services/constants/sports';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { useCurrentUser } from '@/hooks/use-current-user';
import VerificationDetailsContent, {
  hasVerificationDetails,
} from '@/components/ui/verification-details-content';
import AppDialog from '@/components/ui/app-dialog';
import { EXPERTS_BETA_ENABLED, STRAVA_ENABLED } from '@/lib/feature-flags';
import DateText from '@/components/ui/date-text';
import {
  deleteExpertReview,
  fetchExpertReviews,
  submitExpertReview,
} from '@/services/reviews/reviews.service';
import { fetchMyParticipantEvents } from '@/services/participants/participants.service';
import TrailRequestModal, {
  type TrailRequestSubmitPayload,
} from '@/components/feature-components/trail-request/trail-request-modal';

interface ExpertDetail extends User {
  events: Event[];
}

export default function ExpertDetailPage() {
  const params = useParams<{ id: string }>();
  const expertId = params?.id;
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAcceptTerms, setReviewAcceptTerms] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState<string | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestModalMessage, setRequestModalMessage] = useState('');
  const [requestSubmitDisabledReason, setRequestSubmitDisabledReason] = useState('');

  const { data: expert, isLoading: loading } = useQuery<ExpertDetail | null>({
    queryKey: ['expert-detail', expertId || ''],
    queryFn: async ({ signal }) => {
      if (!expertId) return null;
      const [experts, events] = await Promise.all([
        fetchExperts({ id: expertId }, signal),
        fetchExpertEvents(expertId, signal),
      ]);
      const base = (experts || []).find((e: User) => e.id === expertId);
      if (!base) return null;
      return {
        ...(base as User),
        events: events || [],
      };
    },
    enabled: !!expertId,
  });
  const { data: strava } = useQuery({
    queryKey: QUERY_KEYS.experts.strava(expertId || ''),
    queryFn: ({ signal }) => fetchExpertStravaSummary(expertId || '', signal),
    enabled: STRAVA_ENABLED && !!expertId,
  });

  const { data: reviewData, isLoading: loadingReviews } = useQuery<{
    reviews: ExpertReview[];
    summary: { averageRating: number; count: number };
  }>({
    queryKey: QUERY_KEYS.experts.reviews(expertId || ''),
    queryFn: ({ signal }) => fetchExpertReviews(expertId || '', signal),
    enabled: !!expertId,
  });
  const { data: joinedEvents = [] } = useQuery({
    queryKey: QUERY_KEYS.events.joinedByParticipant,
    queryFn: ({ signal }) => fetchMyParticipantEvents(signal),
    enabled: currentUser?.role === 'participant',
  });

  const existingReview = useMemo(
    () =>
      reviewData?.reviews?.find((review) => review.reviewer_user_id === currentUser?.id) ||
      null,
    [reviewData?.reviews, currentUser?.id]
  );

  useEffect(() => {
    if (!existingReview) {
      setReviewRating(5);
      setReviewComment('');
      return;
    }
    // Keep rating synced for quick update, but start with an empty comment input
    // so old test/demo text does not auto-populate unexpectedly.
    setReviewRating(existingReview.rating || 5);
    setReviewComment('');
  }, [existingReview]);

  const reviewMutation = useMutation({
    mutationFn: (payload: { rating: number; comment?: string }) =>
      submitExpertReview(expertId || '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.experts.reviews(expertId || '') });
      setReviewMessage('Review submitted. Thanks for sharing!');
      setReviewAcceptTerms(false);
    },
    onError: (error) => {
      setReviewMessage(error instanceof Error ? error.message : 'Failed to submit review.');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: () => deleteExpertReview(expertId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.experts.reviews(expertId || '') });
      setReviewRating(5);
      setReviewComment('');
      setReviewAcceptTerms(false);
      setReviewMessage('Your review was deleted.');
    },
    onError: (error) => {
      setReviewMessage(error instanceof Error ? error.message : 'Failed to delete review.');
    },
  });

  const galleryMutation = useMutation({
    mutationFn: async (payload: { action: 'add' | 'delete'; photo_url: string }) => {
      const response = await fetch(`/api/experts/${expertId}/gallery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update gallery');
      }
      return data as { photos: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-detail', expertId || ''] });
    },
  });

  const expertSports = Array.isArray(expert?.sports)
    ? expert.sports
    : expert?.sports
      ? [expert.sports]
      : [];
  const sportsFilter = expertSports.join(',');

  const { data: requestTrails = [] } = useQuery({
    queryKey: ['expert-detail-request-trails', expertId || '', sportsFilter],
    enabled: requestModalOpen && Boolean(expertId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({ purpose: 'request' });
      if (sportsFilter) query.set('sports', sportsFilter);
      const response = await fetch(`/api/trails?${query.toString()}`, { signal });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load trails');
      }
      return (data?.trails || []) as Array<{ id: string; name: string; sport_type?: string | null }>;
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (payload: TrailRequestSubmitPayload) => {
      const response = await fetch(`/api/trails/${payload.trailId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: payload.description,
          preferred_date: payload.preferred_date,
          preferred_time: payload.preferred_time,
          offered_price_npr: payload.offered_price_npr ?? null,
          nearest_point: payload.nearest_point,
          expert_user_id: payload.expert_user_id,
          needs_paid_shuttle: payload.needs_paid_shuttle ?? false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to request trail activity');
      }
      return data;
    },
    onSuccess: () => {
      setRequestModalMessage('Trail request submitted successfully.');
      setRequestModalOpen(false);
    },
    onError: (error) => {
      setRequestModalMessage(
        error instanceof Error ? error.message : 'Failed to request trail activity.'
      );
    },
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 py-6">
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-slate-300 mb-4">Expert not found.</p>
        <Link
          href="/experts"
          className="inline-flex px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
        >
          Back to experts
        </Link>
      </div>
    );
  }

  const upcomingEvents = expert.events.filter(
    (e) => new Date(e.event_date) >= new Date()
  );
  const sports = Array.isArray(expert.sports) ? expert.sports : [];
  const stravaProfileId = strava?.profile?.id;
  const initials =
    (expert.name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'EX';
  const reviewSummary = reviewData?.summary || { averageRating: 5, count: 0 };
  const canReviewExpert =
    (expert.role === 'expert' && currentUser?.role === 'admin') ||
    (currentUser?.role === 'participant' &&
      expert.role === 'expert' &&
      joinedEvents.some((event) => event.host_user_id === expertId));
  const canManageGallery =
    Boolean(currentUser?.role === 'admin') ||
    Boolean(currentUser?.role === 'expert' && currentUser?.id === expertId);
  const galleryPhotos = Array.isArray(expert.expert_gallery_photos)
    ? expert.expert_gallery_photos
    : [];
  const associatedTrails = Array.isArray(expert.associated_trails)
    ? expert.associated_trails
    : [];
  const hasExpertVerificationDetails = hasVerificationDetails({
    yearsExperience: expert.verification_years_experience,
    certifications: expert.verification_certifications,
    guidingHistory: expert.verification_guiding_history,
    safetyTraining: expert.verification_safety_training,
    achievements: expert.verification_achievements,
    stravaUrl: expert.verification_strava_url,
    links: expert.verification_links,
  });

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={`expert-star-${index}`} className="text-sm">
          {index < Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );

  const openReviewModal = () => {
    if (!currentUser) {
      window.dispatchEvent(
        new CustomEvent('open-login', {
          detail: {
            message: 'Login to review this expert.',
            next: `/experts/${expert.id}`,
          },
        })
      );
      return;
    }
    if (!canReviewExpert) {
      setReviewMessage(
        'You can review this expert only after joining one of their rides. Admins can review directly.'
      );
      setReviewModalOpen(true);
      return;
    }
    setReviewMessage(null);
    setReviewModalOpen(true);
  };

  const openRequestModal = () => {
    if (!currentUser) {
      setRequestSubmitDisabledReason('Please login as a participant to submit a trail request.');
      setRequestModalMessage('');
      setRequestModalOpen(true);
      return;
    }
    if (currentUser.role !== 'participant') {
      setRequestSubmitDisabledReason('Trail requests are available for participants only.');
      setRequestModalMessage('');
      setRequestModalOpen(true);
      return;
    }
    setRequestSubmitDisabledReason('');
    setRequestModalMessage('');
    setRequestModalOpen(true);
  };

  const handleUploadGalleryPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGalleryMessage(null);

    if (!file.type.startsWith('image/')) {
      setGalleryMessage('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setGalleryMessage('Image is too large. Use an image under 4MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setGalleryMessage('Failed to read image.');
        return;
      }
      try {
        await galleryMutation.mutateAsync({ action: 'add', photo_url: result });
        setGalleryMessage('Gallery photo uploaded.');
      } catch (error) {
        setGalleryMessage(error instanceof Error ? error.message : 'Failed to upload image.');
      }
    };
    reader.onerror = () => setGalleryMessage('Failed to read image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-lg shadow-emerald-100/60 dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 dark:shadow-emerald-950/30 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/30" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />
        <div className="relative">
          <div className="mb-6 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-slate-300">
            <div>
              <p className="font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Expert Profile
              </p>
              <div className="mt-1">
                <Link
                  href="/experts"
                  className="font-medium underline decoration-emerald-300 underline-offset-2 hover:text-green-700 dark:hover:text-emerald-200"
                >
                  All experts
                </Link>{' '}
                / Profile
              </div>
            </div>
            {EXPERTS_BETA_ENABLED && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                Beta
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white text-emerald-900 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-100">
                  {expert.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={expert.profile_photo_url}
                      alt={expert.name || 'Expert'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {expert.is_verified_expert ? (
                      <span className="inline-flex items-center rounded-full bg-green-700 px-3 py-1 text-xs font-semibold text-white dark:bg-emerald-400 dark:text-emerald-950">
                        Verified Expert
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                        Pending Verification
                      </span>
                    )}
                    {strava?.connected && stravaProfileId && currentUser?.id === expertId && (
                      <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-100">
                        Strava Verified
                      </span>
                    )}
                  </div>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-green-900 dark:text-green-100 sm:text-4xl">
                    {expert.name || 'Local Expert'}
                  </h1>
                  {expert.city && (
                    <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-300">
                      {expert.city}
                    </p>
                  )}
                </div>
              </div>

              {expert.bio && (
                <p className="mt-5 max-w-3xl text-sm leading-7 text-gray-700 dark:text-slate-200">
                  {expert.bio}
                </p>
              )}

              {sports.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {sports.map((sport) => (
                    <span
                      key={sport}
                      className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-900/60 dark:text-emerald-200"
                    >
                      {getSportLabel(sport)}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                    Rating
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {reviewSummary.averageRating.toFixed(1)}
                    </span>
                    {renderStars(reviewSummary.averageRating)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {reviewSummary.count} review{reviewSummary.count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                    Events
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {upcomingEvents.length}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Upcoming ride{upcomingEvents.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
                    Trails
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {associatedTrails.length}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Associated trail{associatedTrails.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-emerald-200 bg-white/85 p-5 shadow-sm backdrop-blur-sm dark:border-emerald-900 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Work With This Expert
              </p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                Plan a local ride
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
                Request trail support, review past rides, or explore upcoming events hosted by this expert.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={`/events?expert=${expert.id}`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                >
                  View Events
                </Link>
                <button
                  type="button"
                  onClick={openRequestModal}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-cyan-600 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-900/40"
                >
                  Request Trail Activity
                </button>
                <button
                  type="button"
                  onClick={openReviewModal}
                  title={
                    !currentUser
                      ? 'Login required to submit a review'
                      : !canReviewExpert
                        ? 'Join this expert’s event first (admins can review directly)'
                        : undefined
                  }
                  className="inline-flex w-full items-center justify-center rounded-lg border border-green-700 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                >
                  {!currentUser
                    ? 'Write Review (Login)'
                    : !canReviewExpert
                      ? 'Write Review (Join First)'
                      : existingReview
                        ? 'Update Review'
                        : 'Write Review'}
                </button>
                {hasExpertVerificationDetails && (
                  <button
                    type="button"
                    onClick={() => setVerificationModalOpen(true)}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Verification Details
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setGalleryModalOpen(true)}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Career Gallery
                </button>
                {strava?.connected && stravaProfileId && currentUser?.id === expertId && (
                  <a
                    href={`https://www.strava.com/athletes/${stravaProfileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-100 dark:hover:bg-orange-900/60"
                  >
                    Check on Strava
                  </a>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {associatedTrails.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Expert Trails
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                Trails associated with {expert.name || 'this expert'}
              </h2>
            </div>
            <Link
              href="/trails"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              Browse all trails
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {associatedTrails.map((trail) => (
              <Link
                key={trail.id}
                href={`/trails/${trail.slug || trail.id}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-emerald-700"
              >
                <div className="h-28 bg-gradient-to-br from-emerald-100 to-lime-100 dark:from-emerald-950 dark:to-slate-800">
                  {trail.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trail.image_url}
                      alt={trail.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                    {trail.name}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-slate-400">
                    {trail.location || 'Nepal'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trail.sport_type && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                        {getSportLabel(trail.sport_type)}
                      </span>
                    )}
                    {trail.difficulty && (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                        {trail.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TrailRequestModal
        open={requestModalOpen}
        onOpenChange={(open) => {
          setRequestModalOpen(open);
          if (!open) {
            setRequestSubmitDisabledReason('');
          }
        }}
        trailOptions={requestTrails.map((trail) => ({
          id: trail.id,
          name: trail.name,
          sport_type: trail.sport_type,
        }))}
        preselectedExpertId={expert.id}
        experts={[
          {
            id: expert.id,
            name: expert.name,
            email: expert.email,
          },
        ]}
        expertsBetaEnabled={EXPERTS_BETA_ENABLED}
        isSubmitting={requestMutation.isPending}
        submitDisabledReason={requestSubmitDisabledReason}
        message={requestModalMessage}
        onMessageChange={setRequestModalMessage}
        onSubmit={(payload) => requestMutation.mutate(payload)}
      />

      {(loadingReviews || Boolean(reviewData?.reviews?.length)) && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Reviews
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                Expert ratings & feedback
              </h2>
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                <span className="text-xl font-semibold text-gray-900 dark:text-white">
                  {reviewSummary.averageRating.toFixed(1)}
                </span>
                {renderStars(reviewSummary.averageRating)}
                <span>({reviewSummary.count} reviews)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {loadingReviews ? (
              <p className="text-sm text-gray-500 dark:text-slate-300">Loading reviews...</p>
            ) : (
              reviewData?.reviews?.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {review.reviewer_photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={review.reviewer_photo_url}
                            alt={review.reviewer_name || 'Reviewer'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {(review.reviewer_name || 'R').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {review.reviewer_name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          <DateText value={review.created_at} pattern="PPP" />
                        </p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-sm text-gray-700 dark:text-slate-200">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Upcoming events with {expert.name || 'this expert'}
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
            No upcoming events listed yet. Check back soon or browse other
            events.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {event.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    <DateText value={event.event_date} pattern="PPP p" />
                    {event.city ? ` • ${event.city}` : ''}
                  </p>
                  {event.sport_type && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {getSportLabel(event.sport_type)}
                    </p>
                  )}
                  {event.meeting_point && (
                    <p className="text-xs text-gray-600 mt-1 dark:text-slate-300">
                      Meeting point: {event.meeting_point}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {event.price_npr > 0 ? `NPR ${event.price_npr}` : 'Free'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/events?city=${encodeURIComponent(event.city || '')}&sport=${encodeURIComponent(
                        event.sport_type || ''
                      )}`}
                      className="inline-flex rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                    >
                      Explore
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AppDialog
        open={verificationModalOpen}
        onOpenChange={setVerificationModalOpen}
        title="Verification Details"
        description="Credentials and experience shared by this expert."
      >
        <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-4 dark:border-emerald-900/60 dark:bg-slate-900/60">
          <VerificationDetailsContent
            yearsExperience={expert.verification_years_experience}
            certifications={expert.verification_certifications}
            guidingHistory={expert.verification_guiding_history}
            safetyTraining={expert.verification_safety_training}
            achievements={expert.verification_achievements}
            stravaUrl={expert.verification_strava_url}
            links={expert.verification_links}
          />
        </div>
      </AppDialog>

      <AppDialog
        open={galleryModalOpen}
        onOpenChange={setGalleryModalOpen}
        title="Career Gallery"
        description="Achievements, race moments, and photos from this expert’s journey."
      >
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {canManageGallery ? (
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
                {galleryMutation.isPending ? 'Uploading...' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadGalleryPhoto}
                  disabled={galleryMutation.isPending}
                />
              </label>
            ) : (
              <span />
            )}
            {galleryMessage && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{galleryMessage}</p>
            )}
          </div>
          {galleryPhotos.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
              No gallery photos added yet.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {galleryPhotos.map((photoUrl, index) => (
                <div
                  key={`${photoUrl}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={`Career gallery ${index + 1}`}
                    className="h-40 w-full object-cover"
                  />
                  {canManageGallery && (
                    <button
                      type="button"
                      disabled={galleryMutation.isPending}
                      onClick={async () => {
                        setGalleryMessage(null);
                        try {
                          await galleryMutation.mutateAsync({
                            action: 'delete',
                            photo_url: photoUrl,
                          });
                          setGalleryMessage('Gallery photo removed.');
                        } catch (error) {
                          setGalleryMessage(
                            error instanceof Error ? error.message : 'Failed to delete image.'
                          );
                        }
                      }}
                      className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppDialog>

      <AppDialog
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        title={existingReview ? 'Update Your Review' : 'Review This Expert'}
        description="Share your experience to help other participants."
      >
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setReviewMessage(null);
                if (!canReviewExpert) {
                  setReviewMessage(
                    'You can review this expert only after joining one of their rides. Admins can review directly.'
                  );
                  return;
                }
                if (!reviewAcceptTerms) {
                  setReviewMessage('Please accept the terms before submitting your review.');
                  return;
                }
                await reviewMutation.mutateAsync({
                  rating: reviewRating,
                  comment: reviewComment,
                });
              }}
              className="mt-4 grid gap-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Rating
                </label>
                <select
                  value={reviewRating}
                  onChange={(event) => setReviewRating(Number(event.target.value))}
                  disabled={!canReviewExpert}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={`expert-rating-${value}`} value={value}>
                      {value} star{value > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                {renderStars(reviewRating)}
              </div>
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={4}
                disabled={!canReviewExpert}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Share how this expert performed during your ride or training."
              />
              <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={reviewAcceptTerms}
                  onChange={(event) => setReviewAcceptTerms(event.target.checked)}
                  disabled={!canReviewExpert}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I agree to the{' '}
                  <a href="/terms" className="font-semibold text-emerald-700 hover:underline">
                    Terms &amp; Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="font-semibold text-emerald-700 hover:underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {existingReview && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  You already reviewed this expert on{' '}
                  <DateText value={existingReview.created_at} pattern="PPP" />. Submitting again
                  will update your previous review.
                </p>
              )}
              {reviewMessage && (
                <p className="text-xs text-emerald-800 dark:text-emerald-200">{reviewMessage}</p>
              )}
              <button
                type="submit"
                disabled={reviewMutation.isPending || !reviewAcceptTerms || !canReviewExpert}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewMutation.isPending ? 'Saving...' : existingReview ? 'Update Review' : 'Submit Review'}
              </button>
              {existingReview && (
                <button
                  type="button"
                  disabled={deleteReviewMutation.isPending}
                  onClick={() => {
                    setReviewMessage(null);
                    deleteReviewMutation.mutate();
                  }}
                  className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  {deleteReviewMutation.isPending ? 'Deleting...' : 'Delete My Review'}
                </button>
              )}
            </form>
      </AppDialog>
    </div>
  );
}
