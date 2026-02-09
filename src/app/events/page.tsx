'use client';

import { useRef, useState, useEffect } from 'react';
import { Event, ExpertiseLevel, SportType, User } from '@/types';
import { format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import * as Toast from '@radix-ui/react-toast';
import { useRouter, useSearchParams } from 'next/navigation';

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpertise, setSelectedExpertise] = useState<ExpertiseLevel | ''>('');
  const [userExpertise, setUserExpertise] = useState<ExpertiseLevel>('beginner');
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('Kathmandu');
  const [selectedSport, setSelectedSport] = useState<SportType | ''>('');
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [experts, setExperts] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());
  const [joinTarget, setJoinTarget] = useState<Event | null>(null);
  const [joining, setJoining] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const lastSyncedQuery = useRef<string>('');
  const [filtersReady, setFiltersReady] = useState(false);

  useEffect(() => {
    if (!filtersReady) return;
    fetchEvents();
  }, [filtersReady, selectedExpertise, showOnlyUpcoming, selectedCity, selectedSport, selectedExpert]);

  useEffect(() => {
    const query = searchParams.toString();
    if (query === lastSyncedQuery.current) {
      return;
    }

    const expertFromQuery = searchParams.get('expert');
    const cityFromQuery = searchParams.get('city');
    const sportFromQuery = searchParams.get('sport');
    const expertiseFromQuery = searchParams.get('expertise');
    const upcomingFromQuery = searchParams.get('upcoming');

    if (expertFromQuery !== null) setSelectedExpert(expertFromQuery);
    if (cityFromQuery !== null) setSelectedCity(cityFromQuery);
    if (sportFromQuery !== null)
      setSelectedSport(sportFromQuery as SportType | '');
    if (expertiseFromQuery !== null)
      setSelectedExpertise(expertiseFromQuery as ExpertiseLevel | '');
    if (upcomingFromQuery !== null)
      setShowOnlyUpcoming(upcomingFromQuery === 'true');

    lastSyncedQuery.current = query;
    setFiltersReady(true);
  }, [searchParams]);

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        setCurrentUser(data.user || null);
        if (data.user?.role === 'participant') {
          const joinedRes = await fetch('/api/participants/me/events');
          const joinedData = await joinedRes.json();
          const ids = new Set<string>(
            (joinedData.events || []).map((evt: Event) => evt.id)
          );
          setJoinedEventIds(ids);
        }
      } catch (error) {
        console.error('Error fetching user', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const res = await fetch('/api/experts?verified=true');
        const data = await res.json();
        setExperts(data.experts || []);
      } catch (error) {
        console.error('Error fetching experts', error);
      }
    };
    fetchExperts();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExpertise) {
        params.append('expertise', selectedExpertise);
      }
      if (selectedCity) {
        params.append('city', selectedCity);
      }
      if (selectedSport) {
        params.append('sport', selectedSport);
      }
      if (selectedExpert) {
        params.append('expert', selectedExpert);
      }
      if (showOnlyUpcoming) {
        params.append('upcoming', 'true');
      }

      const response = await fetch(`/api/events?${params.toString()}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = (eventData: Event) => {
    if (!currentUser) {
      router.push('/register');
      return;
    }
    setJoinTarget(eventData);
  };

  const confirmJoin = async () => {
    if (!joinTarget || !currentUser) return;
    setJoining(true);
    try {
      const response = await fetch(`/api/events/${joinTarget.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_name: currentUser.name || 'Participant',
          participant_email: currentUser.email,
          phone: currentUser.phone || undefined,
          expertise_level: userExpertise,
        }),
      });

      if (response.ok) {
        setJoinTarget(null);
        setToastOpen(true);
        setJoinedEventIds((prev) => new Set(prev).add(joinTarget.id));
        fetchEvents();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to join event');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      'Leave this event? You might lose your spot.'
    );
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/events/${eventId}/leave`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to leave event');
        return;
      }
      setJoinedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      fetchEvents();
    } catch (error) {
      console.error('Error leaving event:', error);
      alert('Failed to leave event');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    const confirmed = window.confirm(
      'Cancel this event for everyone? This cannot be undone.'
    );
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/events/${eventId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to cancel event');
        return;
      }
      fetchEvents();
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event');
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

  // Group events by expertise level
  const eventsByExpertise = expertiseLevels.reduce((acc, level) => {
    acc[level] = events.filter((event) => event.required_expertise === level);
    return acc;
  }, {} as Record<ExpertiseLevel, Event[]>);

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-green-800">Events</h1>

      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Expertise Level</label>
            <select
              value={userExpertise}
              onChange={(e) => setUserExpertise(e.target.value as ExpertiseLevel)}
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
              onChange={(e) => setSelectedExpertise(e.target.value as ExpertiseLevel | '')}
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
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="Kathmandu">Kathmandu</option>
              <option value="Pokhara">Pokhara</option>
              <option value="">All Cities</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnlyUpcoming}
                onChange={(e) => setShowOnlyUpcoming(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Show only upcoming events</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sport Type</label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value as SportType | '')}
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
              onChange={(e) => setSelectedExpert(e.target.value)}
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
        <div className="text-center py-12">
          <p className="text-gray-600">Loading events...</p>
        </div>
      ) : (
        <>
          {selectedExpertise ? (
            // Show filtered events
            <div>
              <h2 className="text-2xl font-bold mb-6 capitalize">
                {selectedExpertise} Events
              </h2>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No events found for this expertise level.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {events.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onJoin={() => handleJoinEvent(event)}
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
                        />
                      ))}
                </div>
              )}
            </div>
          ) : (
            // Show events grouped by expertise
            <div className="space-y-12">
              {expertiseLevels.map((level) => {
                const levelEvents = eventsByExpertise[level];
                if (levelEvents.length === 0) return null;

                return (
                  <div key={level}>
                    <h2 className="text-2xl font-bold mb-6 capitalize border-b-2 border-green-600 pb-2">
                      {level} Events ({levelEvents.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {levelEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onJoin={() => handleJoinEvent(event)}
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

      <Dialog.Root open={Boolean(joinTarget)} onOpenChange={(open) => !open && setJoinTarget(null)}>
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
                disabled={joining}
                className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
              >
                {joining ? 'Joining...' : 'Confirm & Join'}
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
  onLeave,
  onCancel,
  canJoin,
  hasJoined,
  isAdminOrExpert,
}: {
  event: Event;
  onJoin: () => void;
  onLeave: () => void;
  onCancel: () => void;
  canJoin: boolean;
  hasJoined: boolean;
  isAdminOrExpert: boolean;
}) {
  const handleCardClick = () => {
    if (event.trail?.id) {
      window.location.href = `/trails/${event.trail.id}`;
    }
  };
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
            <p className="text-sm text-gray-500">
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

        {event.description && (
          <p className="text-gray-700 mb-4">{event.description}</p>
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

        <div onClick={(event) => event.stopPropagation()} className="space-y-2">
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
    </div>
  );
}
