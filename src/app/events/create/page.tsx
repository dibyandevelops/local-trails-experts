'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Trail,
  Event,
  Difficulty,
  ExpertiseLevel,
  CreateEventInput,
  SportType,
  User,
} from '@/types';
import { useCurrentUser } from '@/hooks/use-current-user';
import { fetchTrails } from '@/services/trails/trails.service';
import {
  createEvent,
  fetchEventById,
  fetchVerifiedExperts,
  updateEvent,
} from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';

const sportLabels: Record<SportType, string> = {
  mtb: 'MTB Trail Rides',
  hiking: 'Hiking',
  trail_running: 'Trail Running',
  training: 'Training & Coaching',
  local_tour: 'Local Tours',
};

export default function CreateEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('mode') === 'edit';
  const editEventId = searchParams.get('id');
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();
  const [isPaidEvent, setIsPaidEvent] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
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
    qr_image_url: '',
    host_user_id: undefined,
  });

  const { data: trails = [], isLoading: loadingTrails } = useQuery<Trail[]>({
    queryKey: QUERY_KEYS.trails.forEvents,
    queryFn: ({ signal }) => fetchTrails({}, signal),
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    enabled: currentUser?.role === 'admin',
  });

  const { data: editEvent, isLoading: loadingEditData, error: editEventError } = useQuery<Event>({
    queryKey: QUERY_KEYS.events.byId(editEventId),
    queryFn: ({ signal }) => fetchEventById(editEventId as string, signal),
    enabled: isEditMode && !!editEventId,
  });

  useEffect(() => {
    if (!editEvent) return;
    setFormData((prev) => ({
      ...prev,
      title: editEvent.title || '',
      description: editEvent.description || '',
      trail_id: editEvent.trail_id || '',
      event_date: editEvent.event_date
        ? new Date(editEvent.event_date).toISOString().slice(0, 16)
        : '',
      organizer_name: editEvent.organizer_name || '',
      organizer_email: editEvent.organizer_email || '',
      max_participants: editEvent.max_participants || 20,
      meeting_point: editEvent.meeting_point || '',
      difficulty: editEvent.difficulty || undefined,
      required_expertise: editEvent.required_expertise || 'beginner',
      sport_type: editEvent.sport_type || prev.sport_type,
      city: editEvent.city || prev.city,
      price_npr: editEvent.price_npr || 0,
      qr_image_url: editEvent.qr_image_url || '',
      host_user_id: editEvent.host_user_id || undefined,
    }));
    setIsPaidEvent((editEvent.price_npr || 0) > 0);
    setQrPreview(editEvent.qr_image_url || null);
  }, [editEvent]);

  useEffect(() => {
    if (!editEventError || !isEditMode) return;
    alert('Failed to load event for editing');
    router.push('/events');
  }, [editEventError, isEditMode, router]);

  useEffect(() => {
    if (currentUser?.role !== 'expert') return;
    setFormData((prev) => ({
      ...prev,
      host_user_id: currentUser.id,
      organizer_name: currentUser.name || prev.organizer_name,
      organizer_email: currentUser.email || prev.organizer_email,
    }));
  }, [currentUser]);

  const selectedExpert =
    formData.host_user_id &&
    experts.find((expert) => expert.id === formData.host_user_id);
  const effectiveUser = (
    currentUser?.role === 'expert' ? currentUser : selectedExpert
  ) as User;
  const expertSports = Array.isArray(effectiveUser?.sports)
    ? effectiveUser?.sports
    : [];

  useEffect(() => {
    if (expertSports.length === 0) return;
    if (!formData.sport_type || !expertSports.includes(formData.sport_type)) {
      setFormData((prev) => ({
        ...prev,
        sport_type: expertSports[0] as SportType,
      }));
    }
  }, [expertSports, formData.sport_type]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateEventInput) => createEvent(payload),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateEventInput) =>
      updateEvent(editEventId as string, payload),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (currentUser?.role === 'admin' && !formData.host_user_id) {
        alert('Please select an approved expert host before creating an event.');
        return;
      }

      if (isPaidEvent && (!formData.price_npr || formData.price_npr <= 0)) {
        alert('Paid events must have a price greater than 0.');
        return;
      }

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
        price_npr: isPaidEvent ? formData.price_npr ?? 0 : 0,
        qr_image_url: formData.qr_image_url || undefined,
        host_user_id: formData.host_user_id || undefined,
      };

      if (isEditMode && editEventId) {
        await updateMutation.mutateAsync(payload);
        alert(isEditMode ? 'Event updated successfully!' : 'Event created successfully!');
        router.push(`/events/${editEventId}`);
      } else {
        await createMutation.mutateAsync(payload);
        alert('Event created successfully!');
        router.push('/events');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert(
        error instanceof Error
          ? error.message
          : isEditMode
          ? 'Failed to update event'
          : 'Failed to create event'
      );
    }
  };

  const handleTrailChange = (trailId: string) => {
    const selectedTrail = trails.find((t) => t.id === trailId);
    const detailParts: string[] = [];
    if (selectedTrail?.distance_km) {
      detailParts.push(`Distance: ${selectedTrail.distance_km} km`);
    }
    if (selectedTrail?.elevation_gain_m) {
      detailParts.push(`Elevation gain: ${selectedTrail.elevation_gain_m} m`);
    }
    if (selectedTrail?.estimated_time_hours) {
      detailParts.push(`Estimated time: ${selectedTrail.estimated_time_hours} hours`);
    }
    if (selectedTrail?.difficulty) {
      detailParts.push(`Difficulty: ${selectedTrail.difficulty}`);
    }
    if (selectedTrail?.location) {
      detailParts.push(`Location: ${selectedTrail.location}`);
    }

    const detailsText = detailParts.length > 0 ? `\n\n${detailParts.join(' • ')}` : '';
    const baseDescription = selectedTrail?.description || formData.description || '';
    setFormData({
      ...formData,
      trail_id: trailId,
      difficulty: selectedTrail?.difficulty || undefined,
      description: `${baseDescription}${detailsText}`.trim(),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-green-800">
        {isEditMode ? 'Edit Event' : 'Create Event'}
      </h1>

      {loadingUser || loadingEditData || loadingTrails ? (
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
              value={formData.max_participants ?? ''}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (Number.isNaN(parsed)) return;
                setFormData({ ...formData, max_participants: parsed });
              }}
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

        <div>
          <label className="block text-sm font-medium mb-2">Pricing</label>
          <div className="flex items-center gap-2">
            <input
              id="paid-event-toggle"
              type="checkbox"
              checked={isPaidEvent}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsPaidEvent(checked);
                if (!checked) {
                  setFormData({ ...formData, price_npr: 0 });
                }
              }}
              className="h-4 w-4"
            />
            <label htmlFor="paid-event-toggle" className="text-sm text-gray-700">
              Paid event
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Event Price (NPR)</label>
          <input
            type="number"
            min="0"
            value={formData.price_npr ?? 0}
            onChange={(e) =>
              setFormData({
                ...formData,
                price_npr: Number(e.target.value) || 0,
              })
            }
            disabled={!isPaidEvent}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="0"
          />
          <p className="text-xs text-gray-500 mt-1">0 = free</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            QR Payment Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) {
                setQrPreview(null);
                setFormData((prev) => ({ ...prev, qr_image_url: '' }));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const result = typeof reader.result === 'string' ? reader.result : '';
                setQrPreview(result || null);
                setFormData((prev) => ({ ...prev, qr_image_url: result || '' }));
              };
              reader.readAsDataURL(file);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload QR image used for participant payment reference.
          </p>
          {qrPreview && (
            <img
              src={qrPreview}
              alt="QR preview"
              className="mt-3 h-36 w-36 rounded border border-gray-200 object-contain bg-white"
            />
          )}
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
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select an approved expert</option>
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
                  {sportLabels[sport as SportType] ?? sport}
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
              disabled={currentUser?.role === 'expert'}
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
              disabled={currentUser?.role === 'expert'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isEditMode
                ? 'Saving...'
                : 'Creating...'
              : isEditMode
              ? 'Save Event'
              : 'Create Event'}
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
