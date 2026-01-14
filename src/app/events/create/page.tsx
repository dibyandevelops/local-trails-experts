'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trail,
  Difficulty,
  ExpertiseLevel,
  CreateEventInput,
  SportType,
} from '@/types';

export default function CreateEventPage() {
  const router = useRouter();
  const [trails, setTrails] = useState<Trail[]>([]);
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
  });

  useEffect(() => {
    fetchTrails();
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
    </div>
  );
}

