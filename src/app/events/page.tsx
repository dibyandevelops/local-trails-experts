'use client';

import { useState, useEffect } from 'react';
import { Event, ExpertiseLevel } from '@/types';
import { format } from 'date-fns';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpertise, setSelectedExpertise] = useState<ExpertiseLevel | ''>('');
  const [userExpertise, setUserExpertise] = useState<ExpertiseLevel>('beginner');
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [selectedExpertise, showOnlyUpcoming]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExpertise) {
        params.append('expertise', selectedExpertise);
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

  const handleJoinEvent = async (eventId: string) => {
    const name = prompt('Enter your name:');
    if (!name) return;

    const email = prompt('Enter your email:');
    if (!email) return;

    const phone = prompt('Enter your phone (optional):') || undefined;

    try {
      const response = await fetch(`/api/events/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_name: name,
          participant_email: email,
          phone,
          expertise_level: userExpertise,
        }),
      });

      if (response.ok) {
        alert('Successfully joined the event!');
        fetchEvents();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to join event');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Failed to join event');
    }
  };

  const expertiseLevels: ExpertiseLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

  // Group events by expertise level
  const eventsByExpertise = expertiseLevels.reduce((acc, level) => {
    acc[level] = events.filter((event) => event.required_expertise === level);
    return acc;
  }, {} as Record<ExpertiseLevel, Event[]>);

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-green-800">Events</h1>

      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                      onJoin={() => handleJoinEvent(event.id)}
                      canJoin={event.current_participants < event.max_participants}
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
                          onJoin={() => handleJoinEvent(event.id)}
                          canJoin={event.current_participants < event.max_participants}
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
    </div>
  );
}

function EventCard({
  event,
  onJoin,
  canJoin,
}: {
  event: Event;
  onJoin: () => void;
  canJoin: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
            <p className="text-sm text-gray-500">
              {format(new Date(event.event_date), 'PPP p')}
            </p>
          </div>
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

        {event.description && (
          <p className="text-gray-700 mb-4">{event.description}</p>
        )}

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
              <span className="font-semibold">Organizer:</span> {event.organizer_name}
            </p>
          )}
          <p>
            <span className="font-semibold">Participants:</span> {event.current_participants} / {event.max_participants}
          </p>
        </div>

        <button
          onClick={onJoin}
          disabled={!canJoin}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
            canJoin
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canJoin ? 'Join Event' : 'Event Full'}
        </button>
      </div>
    </div>
  );
}

