'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubmitHandler, useForm } from 'react-hook-form';
import * as Dialog from '@radix-ui/react-dialog';
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
import { fetchTrailById, fetchTrailsPaginated } from '@/services/trails/trails.service';
import { createEvent, fetchEventById, updateEvent } from '@/services/events/events.service';
import { fetchExperts } from '@/services/experts/experts.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import TrailSubmissionForm from '@/components/feature-components/trail-submission-form';
import { getSportLabel, TRAIL_SPORTS } from '@/services/constants/sports';

type EventFormValues = {
  title: string;
  description: string;
  custom_trail_text: string;
  trail_id: string;
  event_date: string;
  organizer_name: string;
  organizer_email: string;
  max_participants: number;
  meeting_point: string;
  difficulty?: Difficulty;
  required_expertise: ExpertiseLevel;
  sport_type: SportType;
  city: string;
  price_npr: number;
  is_paid_event: boolean;
  qr_image_url: string;
  host_user_id: string;
  acceptTerms: boolean;
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

function normalizeDateOnly(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const defaultValues: EventFormValues = {
  title: '',
  description: '',
  custom_trail_text: '',
  trail_id: '',
  event_date: '',
  organizer_name: '',
  organizer_email: '',
  max_participants: 20,
  meeting_point: '',
  difficulty: undefined,
  required_expertise: 'beginner',
  sport_type: 'mtb',
  city: '',
  price_npr: 0,
  is_paid_event: false,
  qr_image_url: '',
  host_user_id: '',
  acceptTerms: false,
};

type EventFormProps = {
  mode?: 'create' | 'edit';
  editEventId?: string | null;
  prefillTrailId?: string;
  prefillTrail?: Trail | null;
  prefillSport?: SportType | '';
  lockTrailAndSport?: boolean;
  embedded?: boolean;
  initialUser?: User | null;
  requestedByName?: string;
  requestedByEmail?: string;
  requestedDate?: string;
  requestedTrailRequestId?: string;
  lockEventDate?: boolean;
  onCompleted?: (eventId: string) => void;
  onCancel?: () => void;
};

export default function EventForm({
  mode = 'create',
  editEventId: editEventIdProp = null,
  prefillTrailId = '',
  prefillTrail = null,
  prefillSport = '',
  lockTrailAndSport = false,
  embedded = false,
  initialUser,
  requestedByName = '',
  requestedByEmail = '',
  requestedDate = '',
  requestedTrailRequestId,
  lockEventDate = false,
  onCompleted,
  onCancel,
}: EventFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditMode = mode === 'edit';
  const editEventId = editEventIdProp;
  const { data: queriedUser = null, isLoading: loadingQueriedUser } = useCurrentUser(
    undefined,
    { enabled: initialUser === undefined }
  );
  const currentUser = initialUser !== undefined ? initialUser : queriedUser;
  const loadingUser = initialUser === undefined ? loadingQueriedUser : false;
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [lastAutoTitle, setLastAutoTitle] = useState('');
  const [lastAutoDescription, setLastAutoDescription] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [sportChangeMessage, setSportChangeMessage] = useState('');
  const [showTrailRequestDialog, setShowTrailRequestDialog] = useState(false);
  const previousSportRef = useRef<SportType | null>(null);
  const skipSportClearRef = useRef(false);
  const prefillAppliedRef = useRef(false);
  const requesterPrefillAppliedRef = useRef(false);
  const requesterKeyRef = useRef('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    getValues,
    reset,
    formState,
  } = useForm<EventFormValues>({
    defaultValues,
  });

  const selectedSport = watch('sport_type');
  const selectedHostId = watch('host_user_id');
  const selectedTrailId = watch('trail_id');
  const isPaidEvent = watch('is_paid_event');
  const currentTitle = watch('title');
  const eventDateValue = watch('event_date');
  const requestedDateOnly = normalizeDateOnly(requestedDate);
  const isEventDateLocked = lockEventDate || Boolean(requestedDateOnly);
  const lockedEventDateTime = requestedDateOnly ? `${requestedDateOnly}T06:30` : '';

  const {
    data: trails = [],
    isLoading: loadingTrails,
    refetch: refetchTrails,
    isFetching: refreshingTrails,
  } = useQuery<Trail[]>({
    queryKey: QUERY_KEYS.trails.paginatedList({
      sport: selectedSport,
      page: 1,
      pageSize: 120,
    }),
    queryFn: async ({ signal }) => {
      const data = await fetchTrailsPaginated(
        {
          sport: selectedSport,
          page: 1,
          pageSize: 120,
        },
        signal
      );
      return data.trails;
    },
    enabled: !lockTrailAndSport,
    placeholderData: (previousData) => previousData,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const { data: experts = [] } = useQuery<User[]>({
    queryKey: QUERY_KEYS.experts.list(),
    queryFn: ({ signal }) => fetchExperts({}, signal),
    enabled: currentUser?.role === 'admin',
  });

  const { data: editEvent, isLoading: loadingEditData, error: editEventError } = useQuery<Event>({
    queryKey: QUERY_KEYS.events.byId(editEventId),
    queryFn: ({ signal }) => fetchEventById(editEventId || '', signal),
    enabled: isEditMode && !!editEventId,
  });

  const { data: lockedTrail, isLoading: loadingLockedTrail } = useQuery<Trail | null>({
    queryKey: QUERY_KEYS.trails.byId(prefillTrailId || null),
    queryFn: ({ signal }) => fetchTrailById(prefillTrailId, signal),
    enabled: lockTrailAndSport && Boolean(prefillTrailId) && !prefillTrail,
    initialData: prefillTrail ?? undefined,
  });

  useEffect(() => {
    if (!editEvent) return;
    reset({
      title: editEvent.title || '',
      description: editEvent.description || '',
      custom_trail_text: '',
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
      sport_type: editEvent.sport_type || 'mtb',
      city: editEvent.city || '',
      price_npr: editEvent.price_npr || 0,
      is_paid_event: (editEvent.price_npr || 0) > 0,
      qr_image_url: editEvent.qr_image_url || '',
      host_user_id: editEvent.host_user_id || '',
    });
    setQrPreview(editEvent.qr_image_url || null);
  }, [editEvent, reset]);

  useEffect(() => {
    if (!formState.isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [formState.isDirty]);

  useEffect(() => {
    if (isEditMode) return;
    const currentDate = getValues('event_date');
    if (currentDate) return;
    setValue('event_date', getUpcomingWeekendDateTimeLocal());
  }, [isEditMode, getValues, setValue]);

  useEffect(() => {
    if (!editEventError || !isEditMode) return;
    alert('Failed to load event for editing');
    router.push('/events');
  }, [editEventError, isEditMode, router]);

  useEffect(() => {
    if (currentUser?.role !== 'expert') return;
    setValue('host_user_id', currentUser.id);
    setValue('organizer_name', currentUser.name || '');
    setValue('organizer_email', currentUser.email || '');
  }, [currentUser, setValue]);

  const selectedExpert = selectedHostId
    ? experts.find((expert) => expert.id === selectedHostId)
    : undefined;
  const selectedHostIsVerified = selectedExpert?.is_verified_expert ?? false;
  const isExpertUnverified =
    currentUser?.role === 'expert' && !currentUser?.is_verified_expert;
  const effectiveUser = (
    currentUser?.role === 'expert' ? currentUser : selectedExpert
  ) as User | undefined;

  const expertSports = Array.isArray(effectiveUser?.sports)
    ? effectiveUser.sports
    : [];
  const selectableSports =
    expertSports.length > 0
      ? TRAIL_SPORTS.filter((sport) => expertSports.includes(sport.value))
      : TRAIL_SPORTS;

  const trailsBySport = useMemo(() => trails, [trails]);
  const selectedLockedTrail = lockTrailAndSport ? lockedTrail : null;

  useEffect(() => {
    if (!selectedTrailId) return;
    const stillVisible = trailsBySport.some((trail) => trail.id === selectedTrailId);
    if (!stillVisible) {
      setValue('trail_id', '');
    }
  }, [trailsBySport, selectedTrailId, setValue]);

  useEffect(() => {
    if (expertSports.length === 0) return;
    const currentSport = getValues('sport_type');
    if (!expertSports.includes(currentSport)) {
      setValue('sport_type', expertSports[0] as SportType);
    }
  }, [expertSports, getValues, setValue]);

  useEffect(() => {
    const previousSport = previousSportRef.current;
    if (!previousSport) {
      previousSportRef.current = selectedSport;
      return;
    }
    if (previousSport === selectedSport) return;
    if (skipSportClearRef.current) {
      skipSportClearRef.current = false;
      previousSportRef.current = selectedSport;
      return;
    }

    // Keep organizer + host + date context, clear event-detail fields that become stale.
    setValue('trail_id', '');
    setValue('title', '');
    setValue('description', '');
    setValue('custom_trail_text', '');
    setValue('difficulty', undefined);
    setValue('meeting_point', '');
    setLastAutoTitle('');
    setLastAutoDescription('');
    setSportChangeMessage('Sport changed. Trail/event-specific fields were cleared.');
    previousSportRef.current = selectedSport;
  }, [selectedSport, setValue]);

  useEffect(() => {
    if (!sportChangeMessage) return;
    const timer = window.setTimeout(() => setSportChangeMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [sportChangeMessage]);

  useEffect(() => {
    if (isEditMode) return;
    if (loadingUser || loadingEditData) return;
    if(!selectedTrailId) return // focus meeting point only after trail is selected, since it's the next logical step and we want to guide users there
    const timer = window.setTimeout(() => {
      setFocus('meeting_point');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isEditMode, loadingUser, loadingEditData, setFocus]);

  useEffect(() => {
    if (isEditMode) return;
    const nextKey = `${requestedByName}|${requestedByEmail}|${requestedDateOnly}`;
    if (requesterKeyRef.current !== nextKey) {
      requesterPrefillAppliedRef.current = false;
      requesterKeyRef.current = nextKey;
    }
    if (requesterPrefillAppliedRef.current) return;
    if (!requestedByName && !requestedByEmail && !requestedDate) {
      requesterPrefillAppliedRef.current = true;
      return;
    }

    const currentDescription = (getValues('description') || '').trim();
    const requesterLine = `Requested by: ${
      requestedByName || 'Participant'
    }${requestedByEmail ? ` (${requestedByEmail})` : ''}`;
    const preferredDateLine = requestedDate ? `Preferred date: ${requestedDate}` : '';
    const requestContext = [requesterLine, preferredDateLine].filter(Boolean).join('\n');
    const nextDescription = currentDescription
      ? `${currentDescription}\n\n${requestContext}`
      : requestContext;
    setValue('description', nextDescription.trim());

    requesterPrefillAppliedRef.current = true;
  }, [
    isEditMode,
    requestedByName,
    requestedByEmail,
    requestedDate,
    getValues,
    setValue,
    requestedDateOnly,
  ]);

  useEffect(() => {
    if (isEditMode) return;
    if (!requestedDateOnly) return;
    setValue('event_date', `${requestedDateOnly}T06:30`);
  }, [isEditMode, requestedDateOnly, setValue]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateEventInput) => createEvent(payload),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateEventInput) =>
      updateEvent(editEventId || '', payload),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleTrailChange = (trailId: string) => {
    setValue('trail_id', trailId);

    const selectedTrail = trailsBySport.find((t) => t.id === trailId);
    if (!selectedTrail) return;
    applyTrailDefaults(selectedTrail, trailId);
  };

  const applyTrailDefaults = (selectedTrail: Trail, trailId: string) => {
    setValue('trail_id', trailId);
    const currentTitleValue = getValues('title')?.trim() || '';
    const prefix =
      TRAIL_SPORTS.find(
        (sport) => sport.value === selectedTrail.sport_type,
      )?.label.split(' ')[0] || 'Event';
    const nextAutoTitle = `${prefix}: ${selectedTrail.name}`;
    if (!currentTitleValue || currentTitleValue === lastAutoTitle) {
      setValue('title', nextAutoTitle);
      setLastAutoTitle(nextAutoTitle);
    }

    if (selectedTrail.difficulty) {
      setValue('difficulty', selectedTrail.difficulty);
    }
    const trailDescription = (selectedTrail.description || '').trim();
    if (trailDescription) {
      const currentDescription = (getValues('description') || '').trim();
      if (!currentDescription || currentDescription === lastAutoDescription) {
        setValue('description', trailDescription);
        setLastAutoDescription(trailDescription);
      }
    }

  };

  useEffect(() => {
    if (selectedSport === 'training') return;
    if (!selectedTrailId) return;
    const selectedTrail = trailsBySport.find((trail) => trail.id === selectedTrailId);
    if (!selectedTrail) return;
    const prefix = TRAIL_SPORTS.find((sport) => sport.value === selectedTrail.sport_type)?.label.split(' ')[0] || 'Event';
    const nextAutoTitle = `${prefix}: ${selectedTrail.name}`;
    const trimmedTitle = (currentTitle || '').trim();
    if (trimmedTitle === nextAutoTitle) return;
    if (!trimmedTitle || trimmedTitle === lastAutoTitle) {
      setValue('title', nextAutoTitle);
      setLastAutoTitle(nextAutoTitle);
    }
  }, [selectedSport, selectedTrailId, trailsBySport, currentTitle, lastAutoTitle, setValue]);

  useEffect(() => {
    if (isEditMode) return;
    if (prefillAppliedRef.current) return;

    if (prefillSport) {
      setValue('sport_type', prefillSport);
    }

    if (!prefillTrailId) {
      prefillAppliedRef.current = true;
      return;
    }

    if (trailsBySport.some((trail) => trail.id === prefillTrailId)) {
      handleTrailChange(prefillTrailId);
      prefillAppliedRef.current = true;
    }
  }, [isEditMode, prefillSport, prefillTrailId, trailsBySport, setValue]);

  useEffect(() => {
    if (!lockTrailAndSport) return;
    if (!selectedLockedTrail) return;
    const lockedSport = (selectedLockedTrail.sport_type || prefillSport || 'mtb') as SportType;
    setValue('sport_type', lockedSport);
    applyTrailDefaults(selectedLockedTrail, selectedLockedTrail.id);
  }, [lockTrailAndSport, selectedLockedTrail, prefillSport, setValue]);

  const onSubmit: SubmitHandler<EventFormValues> = async (values) => {
    try {
      if (isExpertUnverified) {
        alert('Your expert profile is pending verification. You cannot create events yet.');
        return;
      }
      if (currentUser?.role === 'admin' && !values.host_user_id) {
        alert('Please select an approved expert host before creating an event.');
        return;
      }
      if (currentUser?.role === 'admin' && values.host_user_id && !selectedHostIsVerified) {
        alert('Selected expert is not verified yet. Please choose a verified host.');
        return;
      }

      if (values.is_paid_event && (!values.price_npr || values.price_npr <= 0)) {
        alert('Paid events must have a price greater than 0.');
        return;
      }
      if (values.is_paid_event && !values.qr_image_url) {
        alert('Please upload an eSewa QR image for paid events.');
        return;
      }

      const descriptionParts: string[] = [];
      if (values.sport_type === 'training' && values.custom_trail_text.trim()) {
        descriptionParts.push(`Training venue: ${values.custom_trail_text.trim()}`);
      }
      if (values.description.trim()) {
        descriptionParts.push(values.description.trim());
      }
      const payload: CreateEventInput = {
        title: values.title,
        description: descriptionParts.join('\n\n') || undefined,
        trail_id: values.sport_type === 'training' ? undefined : values.trail_id || undefined,
        event_date: values.event_date,
        organizer_name: values.organizer_name || undefined,
        organizer_email: values.organizer_email || undefined,
        max_participants: values.max_participants || undefined,
        meeting_point: values.meeting_point || undefined,
        difficulty: values.difficulty || undefined,
        required_expertise: values.required_expertise,
        sport_type: values.sport_type || 'mtb',
        city: values.city || undefined,
        price_npr: values.is_paid_event ? values.price_npr ?? 0 : 0,
        qr_image_url: values.qr_image_url || undefined,
        host_user_id: values.host_user_id || undefined,
        trail_request_id: requestedTrailRequestId || undefined,
      };

      if (isEditMode && editEventId) {
        await updateMutation.mutateAsync(payload);
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.events.byId(editEventId),
        });
        alert(isEditMode ? 'Event updated successfully!' : 'Event created successfully!');
        if (onCompleted && editEventId) {
          onCompleted(editEventId);
        } else if (editEventId) {
          router.push(`/events/${editEventId}`);
        }
      } else {
        const createdEvent = await createMutation.mutateAsync(payload);
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events.list() });
        alert('Event created successfully!');
        if (onCompleted) {
          onCompleted(createdEvent.id);
        } else {
          router.push('/events');
        }
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

  if (lockTrailAndSport && loadingLockedTrail) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">Loading selected trail...</p>
          <p className="mt-1 text-xs text-gray-500">Preparing event form for this trail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {!embedded && (
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-5 py-6 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-hero-glow/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-hero-glow/30 blur-3xl" />
          <div className="relative">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Events
              </span>
              <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
                Local experts
              </span>
            </div>
            <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
              {isEditMode ? 'Edit Event' : 'Create Event'}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Choose a sport, pick the right trail, and publish an experience riders can trust.
            </p>
          </div>
        </section>
      )}
      {!isEditMode && !embedded && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => router.push('/events/trainings/create')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Use Separate Training Form
          </button>
        </div>
      )}
      {sportChangeMessage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {sportChangeMessage}
        </div>
      )}

      {loadingUser || loadingEditData ? (
        <div className="text-gray-600">Loading user...</div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6 dark:border-slate-800 dark:bg-slate-900"
        >
          {isExpertUnverified && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your expert profile is pending verification. You can create trails, but
              events and trainings are disabled until an admin approves your profile.
            </div>
          )}
          {currentUser?.role === 'admin' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Select an approved host first to unlock sport-specific fields.
            </div>
          )}

          {currentUser?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium mb-2">Approved Expert Host</label>
              <select
                {...register('host_user_id')}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setValue('host_user_id', selectedId, { shouldDirty: true });
                  const expert = experts.find((item) => item.id === selectedId);
                  setValue('organizer_name', expert?.name || '', { shouldDirty: true });
                  setValue('organizer_email', expert?.email || '', { shouldDirty: true });
                  if (Array.isArray(expert?.sports) && expert.sports.length > 0) {
                    skipSportClearRef.current = true;
                    setValue('sport_type', expert.sports[0] as SportType, { shouldDirty: true });
                  }
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select an expert host</option>
                {experts.map((expert) => (
                  <option
                    key={expert.id}
                    value={expert.id}
                    disabled={!expert.is_verified_expert}
                  >
                    {expert.name || 'Expert'} ({expert.email})
                    {!expert.is_verified_expert ? ' — Pending verification' : ''}
                  </option>
                ))}
              </select>
              {selectedHostId && !selectedHostIsVerified && (
                <p className="mt-2 text-xs text-amber-700">
                  This expert is pending verification and cannot host events yet.
                </p>
              )}
            </div>
          )}

          {!lockTrailAndSport ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Sport Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {selectableSports.map((sport) => (
                  <label
                    key={sport.value}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                      selectedSport === sport.value
                        ? 'border-green-700 bg-green-50 text-green-800'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      value={sport.value}
                      {...register('sport_type', { required: true })}
                      disabled={currentUser?.role === 'admin' && !selectedHostId}
                    />
                    {getSportLabel(sport.value) ?? sport.label}
                  </label>
                ))}
              </div>
              {expertSports.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Showing sports available for the selected host.
                </p>
              )}
              {currentUser?.role === 'admin' && !selectedHostId && (
                <p className="mt-1 text-xs text-amber-700">
                  Select an approved host to unlock sport options.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-600">Selected Trail</p>
              <p className="text-sm font-semibold text-gray-900">
                {selectedLockedTrail?.name || 'Trail'}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {selectedLockedTrail?.location || ''}
                {selectedLockedTrail?.sport_type
                  ? ` • ${getSportLabel(selectedLockedTrail.sport_type) || selectedLockedTrail.sport_type}`
                  : ''}
              </p>
            </div>
          )}

          {!lockTrailAndSport && selectedSport !== 'training' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Select Trail</label>
                <select
                  value={selectedTrailId}
                  onChange={(e) => handleTrailChange(e.target.value)}
                  disabled={loadingTrails}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">No specific trail (general event)</option>
                  {trailsBySport.map((trail) => (
                    <option key={trail.id} value={trail.id}>
                      {trail.name} - {trail.location} ({trail.difficulty})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Selecting a trail auto-fills title, description, and difficulty.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Showing trails for {getSportLabel((selectedSport || 'mtb') as SportType) || 'selected sport'}.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Changing sport clears trail/event-specific fields to avoid stale data.
                </p>
                <div className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {loadingTrails
                    ? 'Loading trails...'
                    : refreshingTrails
                      ? 'Refreshing trails...'
                      : `${trailsBySport.length} trail option${trailsBySport.length === 1 ? '' : 's'}`}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Can’t find a trail in this sport?
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Request a new trail, then refresh later to check approval.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refetchTrails()}
                      disabled={refreshingTrails}
                      className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-100 disabled:opacity-60"
                    >
                      {refreshingTrails ? 'Refreshing...' : 'Refresh Trails'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTrailRequestDialog(true)}
                      className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
                    >
                      Request New Trail
                    </button>
                  </div>
                </div>
                {requestMessage && (
                  <p className="text-xs text-gray-700 mt-2">{requestMessage}</p>
                )}
              </div>
            </div>
          ) : !lockTrailAndSport && selectedSport === 'training' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Training Route / Venue</label>
              <input
                type="text"
                {...register('custom_trail_text')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Army HQ Ground loop + handling drills"
              />
              <p className="text-xs text-gray-500 mt-1">
                Free text is enabled for training and coaching events.
              </p>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-2">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('title', { required: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Weekend Mountain Bike Adventure"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Describe your event..."
            />
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Event Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('event_date', { required: true })}
                value={isEventDateLocked ? eventDateValue || lockedEventDateTime : undefined}
                min={isEventDateLocked ? lockedEventDateTime : undefined}
                max={isEventDateLocked ? lockedEventDateTime : undefined}
                onChange={(event) => {
                  if (!isEventDateLocked) return;
                  event.preventDefault();
                  if (lockedEventDateTime) {
                    setValue('event_date', lockedEventDateTime);
                  }
                }}
                onClick={(event) => {
                  if (!isEventDateLocked) return;
                  const input = event.currentTarget as HTMLInputElement & {
                    showPicker?: () => void;
                  };
                  input.showPicker?.();
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {isEventDateLocked && (
                <p className="mt-1 text-xs text-gray-500">
                  Date/time is locked from participant request. You can view it but not edit.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Required Expertise Level <span className="text-red-500">*</span>
              </label>
              <select
                {...register('required_expertise', { required: true })}
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
                {...register('difficulty')}
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
                {...register('max_participants', {
                  setValueAs: (value) => (value === '' ? 20 : Number(value)),
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Meeting Point</label>
            <input
              type="text"
              {...register('meeting_point')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Trailhead parking lot"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use a Google Maps-friendly location name so participants can navigate easily.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pricing</label>
            <div className="flex items-center gap-2">
              <input
                id="paid-event-toggle"
                type="checkbox"
                {...register('is_paid_event')}
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
              {...register('price_npr', {
                setValueAs: (value) => (value === '' ? 0 : Number(value)),
              })}
              disabled={!isPaidEvent}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">0 = free</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">eSewa QR Payment Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setQrPreview(null);
                  setValue('qr_image_url', '');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const result = typeof reader.result === 'string' ? reader.result : '';
                  setQrPreview(result || null);
                  setValue('qr_image_url', result || '');
                };
                reader.readAsDataURL(file);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload the QR image participants will scan to pay.
            </p>
            {qrPreview && (
              <img
                src={qrPreview}
                alt="QR preview"
                className="mt-3 h-36 w-36 rounded border border-gray-200 object-contain bg-white"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organizer Name</label>
              <input
                type="text"
                {...register('organizer_name')}
                disabled={currentUser?.role === 'expert' || currentUser?.role === 'admin'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Organizer Email</label>
              <input
                type="email"
                {...register('organizer_email')}
                disabled={currentUser?.role === 'expert' || currentUser?.role === 'admin'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <input
              id="event-accept-terms"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              {...register('acceptTerms', {
                required: 'Please accept the terms and privacy policy.',
              })}
            />
            <label htmlFor="event-accept-terms" className="text-xs leading-5">
              I agree to the{' '}
              <a href="/terms" className="font-semibold text-green-700 hover:underline">
                Terms &amp; Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="font-semibold text-green-700 hover:underline">
                Privacy Policy
              </a>
              .
            </label>
          </div>
          {formState.errors.acceptTerms?.message && (
            <p className="text-xs text-red-600">{formState.errors.acceptTerms.message}</p>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={Boolean(
                isSubmitting ||
                isExpertUnverified ||
                (currentUser?.role === 'admin' &&
                  selectedHostId &&
                  !selectedHostIsVerified)
              )}
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
              onClick={() => {
                if (formState.isDirty) {
                  const confirmed = window.confirm(
                    'You have unsaved changes. Leave this page?'
                  );
                  if (!confirmed) return;
                }
                if (onCancel) {
                  onCancel();
                } else {
                  router.back();
                }
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <Dialog.Root
        open={showTrailRequestDialog}
        onOpenChange={setShowTrailRequestDialog}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Request New Trail
            </Dialog.Title>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Submit a new trail with GPX. Admin will review it urgently. Once approved, click refresh and select it.
            </p>
            {currentUser?.role && (
              <TrailSubmissionForm
                userRole={currentUser.role}
                submitLabel="Create Trail"
                compact
                onSuccess={(data) => {
                    setRequestMessage('Trail created and available now. Refresh and select it.');
                }}
              />
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTrailRequestDialog(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
