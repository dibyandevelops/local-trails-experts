'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Event, ExpertiseLevel, SportType, User } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelEvent,
  fetchEvents,
  fetchVerifiedExperts,
  joinEvent,
  leaveEvent,
} from '@/services/events/events.service';
import { fetchMyParticipantEvents } from '@/services/participants/participants.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { useUiStore } from '@/stores/ui.store';
import { getSportLabel } from '@/services/constants/sports';
import DateText from '@/components/ui/date-text';

const EMPTY_EVENTS: Event[] = [];

export default function EventsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const eventsFilterDraft = useUiStore((state) => state.eventsFilterDraft);
  const setEventsFilterDraft = useUiStore((state) => state.setEventsFilterDraft);
  const joinEventModalOpen = useUiStore((state) => state.joinEventModalOpen);
  const setJoinEventModalOpen = useUiStore((state) => state.setJoinEventModalOpen);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());
  const [joinTarget, setJoinTarget] = useState<Event | null>(null);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const lastSyncedQuery = useRef<string>('');
  const [filtersReady, setFiltersReady] = useState(false);
  const { data: currentUser = null } = useCurrentUser();

  const selectedExpertise = eventsFilterDraft.expertise;
  const userExpertise = eventsFilterDraft.userExpertise;
  const showOnlyUpcoming = eventsFilterDraft.showUpcoming;
  const selectedCity = eventsFilterDraft.city;
  const selectedSport = eventsFilterDraft.sport;
  const selectedExpert = eventsFilterDraft.expert;

  useEffect(() => {
    const query = searchParams.toString();
    if (query === lastSyncedQuery.current) {
      if (!filtersReady) {
        setFiltersReady(true);
      }
      return;
    }

    const expertFromQuery = searchParams.get('expert');
    const cityFromQuery = searchParams.get('city');
    const sportFromQuery = searchParams.get('sport');
    const expertiseFromQuery = searchParams.get('expertise');
    const upcomingFromQuery = searchParams.get('upcoming');

    const patch: Partial<typeof eventsFilterDraft> = {};
    if (expertFromQuery !== null && expertFromQuery !== selectedExpert) {
      patch.expert = expertFromQuery;
    }
    if (cityFromQuery !== null && cityFromQuery !== selectedCity) {
      patch.city = cityFromQuery;
    }
    if (sportFromQuery !== null && sportFromQuery !== selectedSport) {
      patch.sport = sportFromQuery as SportType | '';
    }
    if (
      expertiseFromQuery !== null &&
      expertiseFromQuery !== selectedExpertise
    ) {
      patch.expertise = expertiseFromQuery as ExpertiseLevel | '';
    }
    if (upcomingFromQuery !== null) {
      const parsedUpcoming = upcomingFromQuery === 'true';
      if (parsedUpcoming !== showOnlyUpcoming) {
        patch.showUpcoming = parsedUpcoming;
      }
    }

    if (Object.keys(patch).length > 0) {
      setEventsFilterDraft(patch);
    }

    lastSyncedQuery.current = query;
    setFiltersReady(true);
  }, [
    searchParams,
    filtersReady,
    selectedExpert,
    selectedCity,
    selectedSport,
    selectedExpertise,
    showOnlyUpcoming,
    eventsFilterDraft,
    setEventsFilterDraft,
  ]);

  useEffect(() => {
    if (!filtersReady) return;
    const params = new URLSearchParams();
    if (selectedExpert) params.set('expert', selectedExpert);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedSport) params.set('sport', selectedSport);
    if (selectedExpertise) params.set('expertise', selectedExpertise);
      if (showOnlyUpcoming) params.set('upcoming', 'true');

    const query = params.toString();
    if (query === lastSyncedQuery.current) {
      return;
    }
    const nextUrl = query ? `/events?${query}` : '/events';
    lastSyncedQuery.current = query;
    router.replace(nextUrl);
  }, [
    filtersReady,
    selectedExpert,
    selectedCity,
    selectedSport,
    selectedExpertise,
    showOnlyUpcoming,
    router,
  ]);

  const { data: events = [], isLoading: loading } = useQuery<Event[]>({
    queryKey: QUERY_KEYS.events.list({
      expertise: selectedExpertise,
      city: selectedCity,
      sport: selectedSport,
      expert: selectedExpert,
      upcoming: showOnlyUpcoming,
    }),
    queryFn: ({ signal }) =>
      fetchEvents(
        {
          expertise: selectedExpertise,
          city: selectedCity,
          sport: selectedSport,
          expert: selectedExpert,
          upcoming: showOnlyUpcoming,
        },
        signal
      ),
    enabled: filtersReady,
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    refetchInterval: 30000,
  });

  const { data: catalogEvents = [] } = useQuery<Event[]>({
    queryKey: QUERY_KEYS.events.list({ upcoming: showOnlyUpcoming }),
    queryFn: ({ signal }) => fetchEvents({ upcoming: showOnlyUpcoming }, signal),
    refetchInterval: 30000,
  });

  const { data: joinedEventsData } = useQuery<Event[]>({
    queryKey: QUERY_KEYS.events.joinedByParticipant,
    queryFn: ({ signal }) => fetchMyParticipantEvents(signal),
    enabled: currentUser?.role === 'participant',
  });
  const joinedEvents = joinedEventsData ?? EMPTY_EVENTS;

  useEffect(() => {
    if (currentUser?.role !== 'participant') {
      setJoinedEventIds((prev) => (prev.size === 0 ? prev : new Set<string>()));
      return;
    }
    const next = new Set(joinedEvents.map((evt) => evt.id));
    setJoinedEventIds((prev) => {
      if (prev.size === next.size) {
        const same = Array.from(next).every((id) => prev.has(id));
        if (same) return prev;
      }
      return next;
    });
  }, [currentUser, joinedEvents]);

  const joinMutation = useMutation({
    mutationFn: (payload: { eventId: string; data: { participant_name: string; participant_email: string; phone?: string; expertise_level: ExpertiseLevel } }) =>
      joinEvent(payload.eventId, payload.data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant }),
      ]);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (eventId: string) => leaveEvent(eventId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.joinedByParticipant }),
      ]);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (eventId: string) => cancelEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
    },
  });

  const handleJoinEvent = (eventData: Event) => {
    if (!currentUser) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/events';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: {
            message: 'Create a participant account to join events.',
            next,
          },
        })
      );
      return;
    }
    setJoinTarget(eventData);
    setRiskAcknowledged(false);
    setJoinEventModalOpen(true);
  };

  const confirmJoin = async () => {
    if (!joinTarget || !currentUser) return;
    try {
      await joinMutation.mutateAsync({
        eventId: joinTarget.id,
        data: {
          participant_name: currentUser.name || 'Participant',
          participant_email: currentUser.email,
          phone: currentUser.phone || undefined,
          expertise_level: userExpertise,
        },
      });
      setJoinTarget(null);
      setJoinEventModalOpen(false);
      setToastOpen(true);
      setJoinedEventIds((prev) => new Set(prev).add(joinTarget.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      'Leave this event? You might lose your spot.'
    );
    if (!confirmed) return;
    try {
      await leaveMutation.mutateAsync(eventId);
      setJoinedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to leave event');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    const confirmed = window.confirm(
      'Cancel this event for everyone? This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await cancelMutation.mutateAsync(eventId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel event');
    }
  };

  const expertiseLevels: ExpertiseLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const sportTypes = useMemo(() => {
    const set = new Set<SportType>();
    for (const event of catalogEvents) {
      if (event.sport_type) set.add(event.sport_type);
    }
    return Array.from(set)
      .sort((a, b) => getSportLabel(a).localeCompare(getSportLabel(b)))
      .map((sport) => ({
        value: sport,
        label: getSportLabel(sport),
      }));
  }, [catalogEvents]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const event of catalogEvents) {
      const city = (event.city || '').trim();
      if (city) set.add(city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catalogEvents]);

  const eventsByExpertise = expertiseLevels.reduce((acc, level) => {
    acc[level] = events.filter((event) => event.required_expertise === level);
    return acc;
  }, {} as Record<ExpertiseLevel, Event[]>);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Events
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Nepal
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Find the next ride or training
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Browse local events, filter by expertise and sport, and join the right crew.
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-emerald-200/70 bg-white/80 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70 sm:p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Expertise Level</label>
            <select
              value={userExpertise}
              onChange={(e) =>
                setEventsFilterDraft({
                  userExpertise: e.target.value as ExpertiseLevel,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {expertiseLevels.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Expertise</label>
            <select
              value={selectedExpertise}
              onChange={(e) =>
                setEventsFilterDraft({
                  expertise: e.target.value as ExpertiseLevel | '',
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              {expertiseLevels.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              list="events-city-options"
              type="text"
              value={selectedCity}
              onChange={(e) => setEventsFilterDraft({ city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Any city (leave blank for all)"
            />
            <datalist id="events-city-options">
              {cityOptions.map((city: string) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnlyUpcoming}
                onChange={(e) =>
                  setEventsFilterDraft({ showUpcoming: e.target.checked })
                }
                className="mr-2"
              />
              <span className="text-sm font-medium">Show only upcoming events</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">Sport Type</label>
            <select
              value={selectedSport}
              onChange={(e) =>
                setEventsFilterDraft({ sport: e.target.value as SportType | '' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Sports</option>
              {sportTypes.map((sport: { value: SportType; label: string }) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expert</label>
            <select
              value={selectedExpert}
              onChange={(e) => setEventsFilterDraft({ expert: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All experts</option>
              {experts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name || expert.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <EventsGridSkeleton />
      ) : (
        <>
          {selectedExpertise ? (
            <div>
              <h2 className="text-2xl font-bold mb-6 capitalize">
                {selectedExpertise} Events
              </h2>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No events found for this expertise level.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onJoin={() => handleJoinEvent(event)}
                      onEdit={() => router.push(`/events/create?mode=edit&id=${event.id}`)}
                      onLeave={() => handleLeaveEvent(event.id)}
                      onCancel={() => handleCancelEvent(event.id)}
                      canJoin={
                        event.current_participants < event.max_participants &&
                        !joinedEventIds.has(event.id)
                      }
                      hasJoined={joinedEventIds.has(event.id)}
                      isAdminOrExpert={
                        currentUser?.role === 'admin' ||
                        currentUser?.role === 'expert'
                      }
                      canEdit={
                        currentUser?.role === 'expert' &&
                        currentUser?.id === event.host_user_id
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 sm:space-y-12">
              {expertiseLevels.map((level) => {
                const levelEvents = eventsByExpertise[level];
                if (levelEvents.length === 0) return null;

                return (
                  <div key={level}>
                    <h2 className="text-2xl font-bold mb-6 capitalize border-b-2 border-green-600 pb-2">
                      {level} Events ({levelEvents.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                      {levelEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onJoin={() => handleJoinEvent(event)}
                          onEdit={() => router.push(`/events/create?mode=edit&id=${event.id}`)}
                          onLeave={() => handleLeaveEvent(event.id)}
                          onCancel={() => handleCancelEvent(event.id)}
                          canJoin={
                            event.current_participants < event.max_participants &&
                            !joinedEventIds.has(event.id)
                          }
                          hasJoined={joinedEventIds.has(event.id)}
                          isAdminOrExpert={
                            currentUser?.role === 'admin' ||
                            currentUser?.role === 'expert'
                          }
                          canEdit={
                            currentUser?.role === 'expert' &&
                            currentUser?.id === event.host_user_id
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600">No events found. Try adjusting your filters.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog.Root
        open={joinEventModalOpen && Boolean(joinTarget)}
        onOpenChange={(open) => {
          setJoinEventModalOpen(open);
          if (!open) {
            setJoinTarget(null);
            setRiskAcknowledged(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Confirm your spot
            </Dialog.Title>
            {joinTarget && (
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{joinTarget.title}</p>
                <p>
                  <DateText value={joinTarget.event_date} pattern="PPP p" />
                  {joinTarget.city ? ` • ${joinTarget.city}` : ''}
                </p>
                <p>
                  <span className="font-semibold">Price:</span>{' '}
                  {joinTarget.price_npr && joinTarget.price_npr > 0
                    ? `NPR ${joinTarget.price_npr}`
                    : 'Free'}
                </p>
                {joinTarget.trail && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="font-semibold text-gray-900">
                      Trail: {joinTarget.trail.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {joinTarget.trail.location}
                    </p>
                    <p className="text-xs text-gray-600">
                      {joinTarget.trail.distance_km
                        ? `${joinTarget.trail.distance_km} km`
                        : ''}
                      {joinTarget.trail.elevation_gain_m
                        ? ` • ${joinTarget.trail.elevation_gain_m}m elevation`
                        : ''}
                    </p>
                  </div>
                )}
                {joinTarget.meeting_point && (
                  <p>
                    <span className="font-semibold">Meeting point:</span>{' '}
                    {joinTarget.meeting_point}
                  </p>
                )}
                {joinTarget.meeting_point && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      joinTarget.meeting_point
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Open in Google Maps
                  </a>
                )}
                {joinTarget.difficulty && (
                  <p>
                    <span className="font-semibold">Difficulty:</span>{' '}
                    {joinTarget.difficulty}
                  </p>
                )}
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold mb-1">Rules & checklist</p>
                  <ul className="space-y-1">
                    <li>• Wear a helmet at all times</li>
                    <li>• Carry a water bottle</li>
                    <li>• Be on time at the meeting point</li>
                    <li>• Follow the guide’s instructions</li>
                  </ul>
                </div>
                <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <input
                    type="checkbox"
                    checked={riskAcknowledged}
                    onChange={(event) => setRiskAcknowledged(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span>
                    I acknowledge the activity carries risk and I will follow the expert’s
                    safety instructions.
                  </span>
                </label>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmJoin}
                disabled={joinMutation.isPending || !riskAcknowledged}
                className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
              >
                {joinMutation.isPending ? 'Joining...' : 'Confirm & Join'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast.Provider swipeDirection="right">
        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          className="fixed bottom-4 right-4 w-[90vw] max-w-sm rounded-2xl bg-white border border-gray-200 shadow-lg p-4"
        >
          <Toast.Title className="text-sm font-semibold text-gray-900">
            You are in!
          </Toast.Title>
          <Toast.Description className="text-xs text-gray-600 mt-1">
            Your spot has been confirmed. See you at the trail.
          </Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-4 right-4 z-50" />
      </Toast.Provider>
    </div>
  );
}

function EventCard({
  event,
  onJoin,
  onEdit,
  onLeave,
  onCancel,
  canJoin,
  hasJoined,
  isAdminOrExpert,
  canEdit,
}: {
  event: Event;
  onJoin: () => void;
  onEdit: () => void;
  onLeave: () => void;
  onCancel: () => void;
  canJoin: boolean;
  hasJoined: boolean;
  isAdminOrExpert: boolean;
  canEdit: boolean;
}) {
  const descriptionSections = (event.description || '')
    .split('\n\n')
    .map((section) => section.trim())
    .filter(Boolean);

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-2xl border border-emerald-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-900/60 dark:bg-slate-950/60"
    >
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
              {event.title}
            </h3>
            <p className="text-xs text-gray-500 sm:text-sm dark:text-slate-400">
              {event.city ? `${event.city} • ` : ''}
              <DateText value={event.event_date} pattern="PPP p" />
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {hasJoined && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100">
                You’re in
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                event.required_expertise === 'beginner'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                  : event.required_expertise === 'intermediate'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
                  : event.required_expertise === 'advanced'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100'
              }`}
            >
              {event.required_expertise}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {event.sport_type && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
              Sport: {getSportLabel(event.sport_type)}
            </span>
          )}
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            {event.price_npr && event.price_npr > 0 ? `NPR ${event.price_npr}` : 'Free'}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            Date: <DateText value={event.event_date} pattern="PPP" />
          </span>
          {event.difficulty && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
              Difficulty: {event.difficulty}
            </span>
          )}
          {event.meeting_point && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
              Meeting: {event.meeting_point}
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            Slots: {event.current_participants} / {event.max_participants}
          </span>
        </div>

        {descriptionSections.length > 0 && (
          <div className="mb-4 space-y-2">
            {descriptionSections.slice(0, 3).map((section, index) => (
              <p
                key={`${event.id}-desc-${index}`}
                className="text-gray-700 whitespace-pre-line text-sm leading-6 dark:text-slate-200"
              >
                {section}
              </p>
            ))}
          </div>
        )}

        {event.trail && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
              Trail: {event.trail.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {event.trail.location}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {event.trail.distance_km && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-900/60 dark:text-blue-100">
                  Distance: {event.trail.distance_km} km
                </span>
              )}
              {event.trail.elevation_gain_m && (
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-900 dark:bg-purple-900/60 dark:text-purple-100">
                  Elevation: {event.trail.elevation_gain_m} m
                </span>
              )}
              {event.trail.estimated_time_hours && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900 dark:bg-orange-900/60 dark:text-orange-100">
                  Time: {event.trail.estimated_time_hours} h
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mb-4 grid gap-2 text-sm text-gray-600 dark:text-slate-300 sm:grid-cols-2">
          {event.organizer_name && (
            <p>
              <span className="font-semibold">Expert:</span> {event.organizer_name}
            </p>
          )}
          {event.organizer_phone && (
            <p>
              <span className="font-semibold">Expert Phone:</span> {event.organizer_phone}
            </p>
          )}
        </div>

        <div
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="space-y-2"
        >
          {canEdit ? (
            <button
              onClick={onEdit}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Edit Event
            </button>
          ) : (
            <button
              onClick={onJoin}
              disabled={!canJoin}
              className={`w-full rounded-lg px-4 py-2 font-semibold transition-colors ${
                canJoin
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {hasJoined ? 'Joined' : canJoin ? 'Join Event' : 'Event Full'}
            </button>
          )}
          {hasJoined && (
            <button
              onClick={onLeave}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900/60"
            >
              Leave Event
            </button>
          )}
          {isAdminOrExpert && (
            <button
              onClick={onCancel}
              className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Cancel Event
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

function EventsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`event-skeleton-${index}`}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="mb-3 h-6 w-2/3 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mb-4 h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="mb-3 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-800" />
            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-slate-800" />
            <div className="h-4 w-4/6 rounded bg-gray-200 dark:bg-slate-800" />
          </div>
          <div className="mb-4 h-20 rounded-lg bg-gray-200 dark:bg-slate-800" />
          <div className="h-10 w-full rounded bg-gray-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
