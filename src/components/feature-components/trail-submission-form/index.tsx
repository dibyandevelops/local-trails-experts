'use client';

import { ChangeEventHandler, useMemo, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import type { Difficulty, SportType, UserRole } from '@/types';
import { TRAIL_SAFETY_OPTIONS, TrailSafetyLabel } from '@/lib/trail-safety';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS } from '@/services/constants/sports';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';

type TrailCreateForm = {
  name: string;
  description: string;
  difficulty: Difficulty;
  sport_type: SportType;
  location: string;
  distance_km: string;
  elevation_gain_m: string;
  estimated_time_hours: string;
  image_url: string;
  safety_labels: TrailSafetyLabel[];
};

const INITIAL_FORM: TrailCreateForm = {
  name: '',
  description: '',
  difficulty: 'easy',
  sport_type: DEFAULT_TRAIL_SPORT,
  location: '',
  distance_km: '',
  elevation_gain_m: '',
  estimated_time_hours: '',
  image_url: '',
  safety_labels: [],
};

type Props = {
  userRole: UserRole;
  onSuccess?: (data: { trail: { id: string }; requiresApproval?: boolean }) => void;
  submitLabel?: string;
  compact?: boolean;
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function TrailSubmissionForm({
  userRole,
  onSuccess,
  submitLabel = 'Create Trail',
  compact = false,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [parsingGpx, setParsingGpx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [trailImages, setTrailImages] = useState<string[]>([]);

  const isAdmin = userRole === 'admin';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<TrailCreateForm>({
    defaultValues: INITIAL_FORM,
  });

  const values = watch();

  const parsedPayload = useMemo(
    () => ({
      name: values.name.trim(),
      description: values.description.trim(),
      difficulty: values.difficulty,
      sport_type: values.sport_type,
      location: values.location.trim(),
      distance_km: values.distance_km.trim(),
      elevation_gain_m: values.elevation_gain_m.trim(),
      estimated_time_hours: values.estimated_time_hours.trim(),
      image_url: values.image_url.trim(),
      safety_labels: isAdmin ? values.safety_labels : undefined,
    }),
    [values, isAdmin]
  );

  const canGenerateDescription =
    Boolean(parsedPayload.name) &&
    Boolean(parsedPayload.location) &&
    Boolean(parsedPayload.sport_type) &&
    Boolean(parsedPayload.difficulty);

  const parseGpxMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('gpx_file', file);
      const { data } = await apiClient.post('/api/trails/parse-gpx', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as {
        distance_km?: number;
        elevation_gain_m?: number;
        estimated_time_hours?: number;
      };
    },
  });

  const submitTrailMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const { data } = await apiClient.post(ApiPath.Trails, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as { trail: { id: string }; requiresApproval?: boolean };
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: values.name,
        location: values.location,
        sport_type: values.sport_type,
        difficulty: values.difficulty,
        distance_km: values.distance_km,
        elevation_gain_m: values.elevation_gain_m,
        estimated_time_hours: values.estimated_time_hours,
      };
      const delays = [700, 1400, 2200];
      for (let attempt = 0; attempt <= delays.length; attempt += 1) {
        try {
          const { data } = await apiClient.post('/api/ai/trail-description', payload);
          return data as { description?: string; source?: string };
        } catch (err) {
          const status = (err as any)?.response?.status;
          if (status === 429 && attempt < delays.length) {
            await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
            continue;
          }
          throw err;
        }
      }
      return { description: '' };
    },
    onSuccess: (data) => {
      if (data?.description) {
        setValue('description', data.description, { shouldDirty: true });
      } else {
        setError('AI did not return a description.');
      }
    },
    onError: (err: any) => {
      if (err?.response?.status === 429) {
        setError('AI rate limit hit. Please wait a moment and try again.');
        return;
      }
      setError('Failed to generate description.');
    },
  });

  const toggleSafetyLabel = (value: TrailSafetyLabel) => {
    const selected = values.safety_labels || [];
    setValue(
      'safety_labels',
      selected.includes(value)
        ? selected.filter((label) => label !== value)
        : [...selected, value],
      { shouldDirty: true }
    );
  };

  const handleGpxChange: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0] || null;
    setGpxFile(file);
    setError(null);
    setNotice(null);
    setValue('distance_km', '');
    setValue('elevation_gain_m', '');
    setValue('estimated_time_hours', '');

    if (!file) return;

    const fileBaseName = file.name.replace(/\.gpx$/i, '').trim();
    if (fileBaseName) {
      setValue('name', fileBaseName, { shouldDirty: true });
    }

    setParsingGpx(true);
    try {
      const data = await parseGpxMutation.mutateAsync(file);

      setValue('distance_km', String(data.distance_km ?? ''));
      setValue('elevation_gain_m', String(data.elevation_gain_m ?? ''));
      setValue('estimated_time_hours', String(data.estimated_time_hours ?? ''));
    } catch {
      setError('Failed to parse GPX file');
    } finally {
      setParsingGpx(false);
    }
  };

  const handleTrailImagesChange: ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setTrailImages([]);
      return;
    }

    try {
      const images = await Promise.all(files.map((file) => fileToDataUrl(file)));
      setTrailImages(images);
      if (!values.image_url && images[0]) {
        setValue('image_url', images[0]);
      }
    } catch {
      setError('Failed to process trail images');
    }
  };

  const onSubmit: SubmitHandler<TrailCreateForm> = async () => {
    if (!gpxFile) {
      setError('GPX file is required.');
      return;
    }
    if (parsingGpx) {
      setError('Please wait until GPX parsing is complete.');
      return;
    }

    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', parsedPayload.name);
      formData.append('description', parsedPayload.description);
      formData.append('difficulty', parsedPayload.difficulty);
      formData.append('sport_type', parsedPayload.sport_type);
      formData.append('location', parsedPayload.location);
      formData.append('distance_km', parsedPayload.distance_km);
      formData.append('elevation_gain_m', parsedPayload.elevation_gain_m);
      formData.append('estimated_time_hours', parsedPayload.estimated_time_hours);
      formData.append('image_url', parsedPayload.image_url);
      formData.append('trail_images', JSON.stringify(trailImages));
      formData.append('gpx_file', gpxFile);

      if (isAdmin) {
        formData.append(
          'safety_labels',
          JSON.stringify(parsedPayload.safety_labels || [])
        );
      }

      const data = await submitTrailMutation.mutateAsync(formData);

      setNotice(
        data.requiresApproval
          ? 'Trail submitted. Waiting for admin approval.'
          : 'Trail created successfully.'
      );
      reset(INITIAL_FORM);
      setGpxFile(null);
      setTrailImages([]);
      onSuccess?.(data);
    } catch {
      setError('Failed to submit trail');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = compact
    ? 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500'
    : 'w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </div>
      )}

      <div>
        <label htmlFor="trail-gpx" className="mb-1 block text-sm font-medium text-gray-700">
          GPX File
        </label>
        <input
          id="trail-gpx"
          type="file"
          accept=".gpx"
          required
          onChange={handleGpxChange}
          className={inputClass}
        />
        {parsingGpx && <p className="text-xs text-green-700 mt-1">Parsing GPX...</p>}
      </div>

      <div>
        <label htmlFor="trail-name" className="mb-1 block text-sm font-medium text-gray-700">
          Trail Name
        </label>
        <input
          id="trail-name"
          {...register('name', { required: true })}
          className={inputClass}
          placeholder="Trail name"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="trail-description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <button
            type="button"
            onClick={() => generateDescriptionMutation.mutate()}
            disabled={!canGenerateDescription || generateDescriptionMutation.isPending}
            className="text-xs font-semibold text-green-700 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generateDescriptionMutation.isPending ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
        <textarea
          id="trail-description"
          rows={3}
          {...register('description')}
          className={inputClass}
          placeholder="Trail description"
        />
        {!canGenerateDescription && (
          <p className="mt-1 text-xs text-gray-500">
            Fill in trail name, location, sport type, and difficulty to enable AI.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="trail-difficulty" className="mb-1 block text-sm font-medium text-gray-700">
            Difficulty
          </label>
          <select id="trail-difficulty" {...register('difficulty')} className={inputClass}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label htmlFor="trail-sport" className="mb-1 block text-sm font-medium text-gray-700">
            Sport Type
          </label>
          <select id="trail-sport" {...register('sport_type')} className={inputClass}>
            {TRAIL_SPORTS.map((sport) => (
              <option key={sport.value} value={sport.value}>
                {sport.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="trail-location" className="mb-1 block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          id="trail-location"
          {...register('location', { required: true })}
          className={inputClass}
          placeholder="City / region"
        />
      </div>

      <div>
        <label htmlFor="trail-pictures" className="mb-1 block text-sm font-medium text-gray-700">
          Trail Pictures
        </label>
        <input
          id="trail-pictures"
          type="file"
          accept="image/*"
          multiple
          onChange={handleTrailImagesChange}
          className={inputClass}
        />
        {trailImages.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">{trailImages.length} image(s) selected</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label htmlFor="trail-distance" className="mb-1 block text-sm font-medium text-gray-700">
            Distance (km)
          </label>
          <input id="trail-distance" type="number" {...register('distance_km')} readOnly className={inputClass} />
        </div>
        <div>
          <label htmlFor="trail-elevation" className="mb-1 block text-sm font-medium text-gray-700">
            Elevation Gain (m)
          </label>
          <input id="trail-elevation" type="number" {...register('elevation_gain_m')} className={inputClass} />
        </div>
        <div>
          <label htmlFor="trail-estimated-time" className="mb-1 block text-sm font-medium text-gray-700">
            Estimated Time (hours)
          </label>
          <input id="trail-estimated-time" type="number" {...register('estimated_time_hours')} className={inputClass} />
        </div>
      </div>

      {/* <div>
        <label htmlFor="trail-image-url" className="mb-1 block text-sm font-medium text-gray-700">
          Cover Image URL (optional)
        </label>
        <input
          id="trail-image-url"
          type="url"
          {...register('image_url')}
          className={inputClass}
          placeholder="https://..."
        />
      </div> */}

      {isAdmin && (
        <div>
          <p className="mb-2 text-sm font-medium">Safety Labels (Admin)</p>
          <div className="flex flex-wrap gap-2">
            {TRAIL_SAFETY_OPTIONS.map((option) => {
              const selected = (values.safety_labels || []).includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSafetyLabel(option.value)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selected
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || parsingGpx}
        className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-70"
      >
        {submitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
}
