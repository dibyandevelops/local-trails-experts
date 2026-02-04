'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trail,
  Difficulty,
  ExpertiseLevel,
  CreateEventInput,
  SportType,
  User,
} from '@/types';

export default function CreateEventPage() {
  const router = useRouter();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [experts, setExperts] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: '',
    trail_id: '',
    event_date: '',
    organizer_name: '',
    organizer_email: '',
    max_participants: 20,
    meeting_point: '',
    difficulty: undefined,
    required_expertise: 'beginner',
    sport_type: 'mtb',
    city: 'Kathmandu',
    price_npr: 0,
    host_user_id: undefined,
  });

  useEffect(() => {
    fetchTrails();
    fetchExperts();
    fetchCurrentUser();
  }, []);

  const fetchTrails = async () => {
    try {
      const response = await fetch('/api/trails');
      const data = await response.json();
      setTrails(data.trails || []);
    } catch (error) {
      console.error('Error fetching trails:', error);
    }
  };

  const fetchExperts = async () => {
    try {
      const response = await fetch('/api/experts?verified=true');
      const data = await response.json();
      setExperts(data.experts || []);
    } catch (error) {
      console.error('Error fetching experts:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/me');
      const data = await response.json();
      setCurrentUser(data.user || null);
      if (data.user?.role === 'expert') {
        setFormData((prev) => ({
          ...prev,
          host_user_id: data.user.id,
        }));
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const selectedExpert =
    formData.host_user_id &&
    experts.find((expert) => expert.id === formData.host_user_id);
  const effectiveUser = (
    currentUser?.role === 'expert' ? currentUser : selectedExpert
  ) as User;
  const expertSports = Array.isArray(effectiveUser?.sports)
    ? effectiveUser?.sports
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: CreateEventInput = {
        ...formData,
        trail_id: formData.trail_id || undefined,
        description: formData.description || undefined,
        organizer_name: formData.organizer_name || undefined,
        organizer_email: formData.organizer_email || undefined,
        meeting_point: formData.meeting_point || undefined,
        difficulty: formData.difficulty || undefined,
        sport_type: formData.sport_type || 'mtb',
        city: formData.city || 'Kathmandu',
        price_npr: formData.price_npr ?? 0,
        host_user_id: formData.host_user_id || undefined,
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Event created successfully!');
        router.push('/events');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleTrailChange = (trailId: string) => {
    const selectedTrail = trails.find((t) => t.id === trailId);
    setFormData({
      ...formData,
      trail_id: trailId,
      difficulty: selectedTrail?.difficulty || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-green-800">Create Event</h1>

      {loadingUser ? (
        <div className="text-gray-600">Loading user...</div>
      ) : !currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'expert') ? (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3">
          You must be an admin or expert to create events.
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., Weekend Mountain Bike Adventure"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Describe your event..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Select Trail</label>
          <select
            value={formData.trail_id}
            onChange={(e) => handleTrailChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">No specific trail (general event)</option>
            {trails.map((trail) => (
              <option key={trail.id} value={trail.id}>
                {trail.name} - {trail.location} ({trail.difficulty})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Required Expertise Level <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.required_expertise}
              onChange={(e) =>
                setFormData({ ...formData, required_expertise: e.target.value as ExpertiseLevel })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              value={formData.difficulty || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  difficulty: e.target.value ? (e.target.value as Difficulty) : undefined,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Auto (from trail)</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max Participants</label>
            <input
              type="number"
              min="1"
              value={formData.max_participants}
              onChange={(e) =>
                setFormData({ ...formData, max_participants: parseInt(e.target.value) || 20 })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Meeting Point</label>
          <input
            type="text"
            value={formData.meeting_point}
            onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., Trailhead parking lot"
          />
        </div>
        {currentUser?.role === 'admin' && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Approved Expert Host
            </label>
            <select
              value={formData.host_user_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value || undefined;
                const expert = experts.find((item) => item.id === selectedId);
                setFormData({
                  ...formData,
                  host_user_id: selectedId,
                  organizer_name: expert?.name || '',
                  organizer_email: expert?.email || '',
                  sport_type:
                    Array.isArray(expert?.sports) && expert?.sports?.length
                      ? (expert.sports[0] as SportType)
                      : formData.sport_type,
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">No expert host</option>
              {experts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name || 'Expert'} ({expert.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {expertSports.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Expert Sport
            </label>
            <div className="flex flex-wrap gap-3">
              {expertSports.map((sport) => (
                <label
                  key={sport}
                  className="inline-flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name="expert_sport"
                    value={sport}
                    checked={formData.sport_type === sport}
                    onChange={() =>
                      setFormData({ ...formData, sport_type: sport as SportType })
                    }
                  />
                  {sport}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Organizer Name</label>
            <input
              type="text"
              value={formData.organizer_name}
              onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Organizer Email</label>
            <input
              type="email"
              value={formData.organizer_email}
              onChange={(e) => setFormData({ ...formData, organizer_email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
