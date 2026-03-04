'use client';

import { useRef, useState, useEffect } from 'react';
import { Event, ExpertiseLevel, SportType, User } from '@/types';
import { format } from 'date-fns';
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
      router.push('/register');
      return;
    }
    setJoinTarget(eventData);
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
  const sportTypes: { value: SportType; label: string }[] = [
    { value: 'mtb', label: 'MTB Trail Ride' },
    { value: 'hiking', label: 'Hiking' },
    { value: 'trail_running', label: 'Trail Running' },
    { value: 'training', label: 'Training' },
    { value: 'local_tour', label: 'Local Tour' },
  ];

  const eventsByExpertise = expertiseLevels.reduce((acc, level) => {
    acc[level] = events.filter((event) => event.required_expertise === level);
    return acc;
  }, {} as Record<ExpertiseLevel, Event[]>);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-green-800 sm:mb-8 sm:text-4xl">Events</h1>

      <div className="mb-6 rounded-lg bg-gray-50 p-4 sm:mb-8 sm:p-6">
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
              type="text"
              value={selectedCity}
              onChange={(e) => setEventsFilterDraft({ city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Any city (leave blank for all)"
            />
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
              {sportTypes.map((sport) => (
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
          if (!open) setJoinTarget(null);
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
                  {format(new Date(joinTarget.event_date), 'PPP p')}
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
                  disabled={joinMutation.isPending}
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
      className="block bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="mb-2 text-lg font-bold text-gray-900 sm:text-xl">{event.title}</h3>
            <p className="text-xs text-gray-500 sm:text-sm">
              {format(new Date(event.event_date), 'PPP p')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {hasJoined && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                You’re in
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                event.required_expertise === 'beginner'
                  ? 'bg-blue-100 text-blue-800'
                  : event.required_expertise === 'intermediate'
                  ? 'bg-green-100 text-green-800'
                  : event.required_expertise === 'advanced'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {event.required_expertise}
            </span>
          </div>
        </div>

        {descriptionSections.length > 0 && (
          <div className="mb-4 space-y-2">
            {descriptionSections.slice(0, 3).map((section, index) => (
              <p
                key={`${event.id}-desc-${index}`}
                className="text-gray-700 whitespace-pre-line text-sm leading-6"
              >
                {section}
              </p>
            ))}
          </div>
        )}

        <div className="mb-4 text-sm font-semibold text-gray-900">
          {event.price_npr && event.price_npr > 0
            ? `Price: NPR ${event.price_npr}`
            : 'Price: Free'}
        </div>

        {event.trail && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="font-semibold text-gray-900 mb-1">Trail: {event.trail.name}</p>
            <p className="text-sm text-gray-600">{event.trail.location}</p>
            {event.trail.distance_km && (
              <p className="text-sm text-gray-600">
                {event.trail.distance_km} km • {event.trail.elevation_gain_m}m elevation
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 mb-4 text-sm text-gray-600">
          {event.meeting_point && (
            <p>
              <span className="font-semibold">Meeting Point:</span> {event.meeting_point}
            </p>
          )}
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
          <p>
            <span className="font-semibold">Participants:</span> {event.current_participants} / {event.max_participants}
          </p>
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
              className="w-full py-2 px-4 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              Edit Event
            </button>
          ) : (
            <button
              onClick={onJoin}
              disabled={!canJoin}
              className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                canJoin
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {hasJoined ? 'Joined' : canJoin ? 'Join Event' : 'Event Full'}
            </button>
          )}
          {hasJoined && (
            <button
              onClick={onLeave}
              className="w-full py-2 px-4 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Leave Event
            </button>
          )}
          {isAdminOrExpert && (
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 rounded-lg border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
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
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="mb-3 h-6 w-2/3 rounded bg-gray-200" />
          <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
          <div className="mb-3 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-4/6 rounded bg-gray-200" />
          </div>
          <div className="mb-4 h-20 rounded-lg bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
