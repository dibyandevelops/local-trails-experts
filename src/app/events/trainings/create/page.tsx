'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { createEvent, fetchVerifiedExperts } from '@/services/events/events.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { CreateEventInput, ExpertiseLevel, SportType, User } from '@/types';

type TrainingFormValues = {
  title: string;
  training_focus: string;
  venue: string;
  event_date: string;
  required_expertise: ExpertiseLevel;
  city: string;
  max_participants: number;
  is_paid_event: boolean;
  price_npr: number;
  organizer_name: string;
  organizer_email: string;
  host_user_id: string;
};

const defaultValues: TrainingFormValues = {
  title: '',
  training_focus: '',
  venue: '',
  event_date: '',
  required_expertise: 'beginner',
  city: 'Kathmandu',
  max_participants: 20,
  is_paid_event: false,
  price_npr: 0,
  organizer_name: '',
  organizer_email: '',
  host_user_id: '',
};

function getUpcomingWeekendDateTimeLocal() {
  const now = new Date();
  const day = now.getDay();
  let daysUntilSaturday = (6 - day + 7) % 7;
  if (daysUntilSaturday === 0) daysUntilSaturday = 7;
  const weekend = new Date(now);
  weekend.setDate(now.getDate() + daysUntilSaturday);
  weekend.setHours(6, 30, 0, 0);
  const year = weekend.getFullYear();
  const month = String(weekend.getMonth() + 1).padStart(2, '0');
  const date = String(weekend.getDate()).padStart(2, '0');
  const hours = String(weekend.getHours()).padStart(2, '0');
  const minutes = String(weekend.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${minutes}`;
}

export default function CreateTrainingPage() {
  const router = useRouter();
  const { data: currentUser = null, isLoading: loadingUser } = useCurrentUser();

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.verified,
    queryFn: ({ signal }) => fetchVerifiedExperts(signal),
    enabled: currentUser?.role === 'admin',
  });

  const { register, handleSubmit, watch, setValue, getValues } =
    useForm<TrainingFormValues>({
      defaultValues,
    });

  const selectedHostId = watch('host_user_id');
  const isPaidEvent = watch('is_paid_event');

  useEffect(() => {
    if (!getValues('event_date')) {
      setValue('event_date', getUpcomingWeekendDateTimeLocal());
    }
  }, [getValues, setValue]);

  useEffect(() => {
    if (currentUser?.role !== 'expert') return;
    setValue('host_user_id', currentUser.id);
    setValue('organizer_name', currentUser.name || '');
    setValue('organizer_email', currentUser.email || '');
  }, [currentUser, setValue]);

  const selectedExpert = selectedHostId
    ? experts.find((expert) => expert.id === selectedHostId)
    : undefined;

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    setValue('organizer_name', selectedExpert?.name || '');
    setValue('organizer_email', selectedExpert?.email || '');
  }, [currentUser, selectedExpert, setValue]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateEventInput) => createEvent(payload),
  });

  const onSubmit: SubmitHandler<TrainingFormValues> = async (values) => {
    try {
      if (currentUser?.role === 'admin' && !values.host_user_id) {
        alert('Please select an approved expert host.');
        return;
      }
      if (values.is_paid_event && (!values.price_npr || values.price_npr <= 0)) {
        alert('Paid training must have a price greater than 0.');
        return;
      }

      const payload: CreateEventInput = {
        title: values.title.trim(),
        description: [
          `Training venue: ${values.venue.trim()}`,
          values.training_focus.trim(),
        ]
          .filter(Boolean)
          .join('\n\n'),
        trail_id: undefined,
        sport_type: 'training' as SportType,
        event_date: values.event_date,
        organizer_name: values.organizer_name || undefined,
        organizer_email: values.organizer_email || undefined,
        max_participants: values.max_participants || undefined,
        meeting_point: values.venue || undefined,
        required_expertise: values.required_expertise,
        city: values.city || 'Kathmandu',
        price_npr: values.is_paid_event ? values.price_npr ?? 0 : 0,
        host_user_id: values.host_user_id || undefined,
      };

      await createMutation.mutateAsync(payload);
      alert('Training created successfully!');
      router.push('/events');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create training');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-3xl font-bold text-green-800 sm:text-4xl">
        Organize Training
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Use this focused form for coaching sessions and skill trainings.
      </p>

      {loadingUser ? (
        <div className="text-gray-600">Loading...</div>
      ) : !currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'expert') ? (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700">
          You must be an admin or expert to organize trainings.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-md"
        >
          {currentUser.role === 'admin' && (
            <div>
              <label className="mb-2 block text-sm font-medium">Approved Expert Host</label>
              <select
                {...register('host_user_id')}
                required
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setValue('host_user_id', selectedId);
                  const expert = experts.find((item) => item.id === selectedId);
                  setValue('organizer_name', expert?.name || '');
                  setValue('organizer_email', expert?.email || '');
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="">Select expert host</option>
                {experts.map((expert) => (
                  <option key={expert.id} value={expert.id}>
                    {expert.name || 'Expert'} ({expert.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Training Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('title', { required: true })}
              placeholder="e.g., MTB Cornering + Braking Fundamentals"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Venue / Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('venue', { required: true })}
              placeholder="e.g., Army HQ Ground, Kathmandu"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Training Focus</label>
            <textarea
              {...register('training_focus')}
              rows={4}
              placeholder="What will participants learn in this session?"
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('event_date', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Required Expertise</label>
              <select
                {...register('required_expertise', { required: true })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">City</label>
              <select
                {...register('city')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              >
                <option value="Kathmandu">Kathmandu</option>
                <option value="Pokhara">Pokhara</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Max Participants</label>
              <input
                type="number"
                min="1"
                {...register('max_participants', {
                  setValueAs: (value) => (value === '' ? 20 : Number(value)),
                })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Pricing</label>
            <div className="flex items-center gap-2">
              <input id="training-paid" type="checkbox" {...register('is_paid_event')} />
              <label htmlFor="training-paid" className="text-sm text-gray-700">
                Paid training
              </label>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Price (NPR)</label>
            <input
              type="number"
              min="0"
              disabled={!isPaidEvent}
              {...register('price_npr', {
                setValueAs: (value) => (value === '' ? 0 : Number(value)),
              })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-60"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">0 = free</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Organizer Name</label>
              <input
                type="text"
                {...register('organizer_name')}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Organizer Email</label>
              <input
                type="email"
                {...register('organizer_email')}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Training'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/events/create')}
              className="rounded-lg border border-gray-300 px-5 py-3 hover:bg-gray-50"
            >
              Event Form
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
