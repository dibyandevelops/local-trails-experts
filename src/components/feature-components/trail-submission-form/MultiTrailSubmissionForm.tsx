'use client';

import { ChangeEventHandler, useState } from 'react';
import Image from 'next/image';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { Difficulty, SportType, UserRole } from '@/types';
import {
  DEFAULT_TRAIL_SAFETY_LABELS,
  TRAIL_SAFETY_OPTIONS,
  TrailSafetyLabel,
} from '@/lib/trail-safety';
import { resizeImageToDataUrl } from '@/lib/image';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS } from '@/services/constants/sports';
import { TRAIL_DIFFICULTY_OPTIONS } from '@/services/constants/difficulty';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';
import StoreLocationPicker from '@/components/feature-components/store-locator/store-location-picker';

const MAX_TRAILS_PER_UPLOAD = 4;

type TrailCreateForm = {
  name: string;
  description: string;
  difficulty: Difficulty;
  sport_type: SportType;
  location: string;
  latitude: string;
  longitude: string;
  distance_km: string;
  elevation_gain_m: string;
  estimated_time_hours: string;
  komoot_embed_url: string;
  image_url: string;
  safety_labels: TrailSafetyLabel[];
};

const createInitialForm = (): TrailCreateForm => ({
  name: '',
  description: '',
  difficulty: 'easy',
  sport_type: DEFAULT_TRAIL_SPORT,
  location: '',
  latitude: '',
  longitude: '',
  distance_km: '',
  elevation_gain_m: '',
  estimated_time_hours: '',
  komoot_embed_url: '',
  image_url: '',
  safety_labels: [...DEFAULT_TRAIL_SAFETY_LABELS],
});

type Props = {
  userRole: UserRole;
  onSuccess?: (data: { trail: { id: string }; requiresApproval?: boolean }) => void;
  submitLabel?: string;
};

function normalizeKomootEmbedInput(input: string) {
  const raw = input.trim();
  if (!raw) return '';
  if (raw.includes('<iframe')) {
    const match = raw.match(/src=["']([^"']+)["']/i);
    return match?.[1]?.trim() || '';
  }
  return raw;
}

function isKomootEmbedUrl(url: string) {
  return /komoot\.com/i.test(url) && /embed/i.test(url);
}

export default function MultiTrailSubmissionForm({
  userRole,
  onSuccess,
  submitLabel = 'Upload Trails',
}: Props) {
  type FormValues = { trails: TrailCreateForm[]; acceptTerms: boolean };
  type Step = 1 | 2 | 3;

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [parsingGpxIndex, setParsingGpxIndex] = useState<number | null>(null);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gpxFiles, setGpxFiles] = useState<Array<File | null>>([null]);

  const isAdmin = userRole === 'admin';
  const canEditSafetyLabels = userRole === 'admin' || userRole === 'expert';

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { trails: [createInitialForm()], acceptTerms: false },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'trails' });
  const values = watch('trails') || [];
  const acceptTerms = watch('acceptTerms');

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
        mid_latitude?: number | null;
        mid_longitude?: number | null;
        last_latitude?: number | null;
        last_longitude?: number | null;
      };
    },
  });

  const addTrail = () => {
    if (fields.length >= MAX_TRAILS_PER_UPLOAD) {
      setError(`You can upload up to ${MAX_TRAILS_PER_UPLOAD} trails at a time.`);
      return;
    }
    append(createInitialForm());
    setGpxFiles((prev) => [...prev, null]);
  };

  const removeTrail = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
    setGpxFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const ensureRowCount = (count: number) => {
    const cappedCount = Math.min(count, MAX_TRAILS_PER_UPLOAD);
    const missing = cappedCount - fields.length;
    if (missing <= 0) return;
    for (let i = 0; i < missing; i += 1) {
      append(createInitialForm());
    }
    setGpxFiles((prev) => [...prev, ...Array.from({ length: missing }, () => null)]);
  };

  const processGpxFile = async (index: number, file: File | null) => {
    setGpxFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });

    setError(null);
    setValue(`trails.${index}.distance_km`, '');
    setValue(`trails.${index}.elevation_gain_m`, '');
    setValue(`trails.${index}.estimated_time_hours`, '');

    if (!file) return;

    const fileBaseName = file.name.replace(/\.gpx$/i, '').trim();
    if (fileBaseName) setValue(`trails.${index}.name`, fileBaseName, { shouldDirty: true });

    setParsingGpxIndex(index);
    try {
      const data = await parseGpxMutation.mutateAsync(file);
      setValue(`trails.${index}.distance_km`, String(data.distance_km ?? ''));
      setValue(`trails.${index}.elevation_gain_m`, String(data.elevation_gain_m ?? ''));
      setValue(`trails.${index}.estimated_time_hours`, String(data.estimated_time_hours ?? ''));

      const midpointLat =
        typeof data.mid_latitude === 'number' && Number.isFinite(data.mid_latitude)
          ? String(data.mid_latitude)
          : typeof data.last_latitude === 'number' && Number.isFinite(data.last_latitude)
          ? String(data.last_latitude)
          : '';
      const midpointLng =
        typeof data.mid_longitude === 'number' && Number.isFinite(data.mid_longitude)
          ? String(data.mid_longitude)
          : typeof data.last_longitude === 'number' && Number.isFinite(data.last_longitude)
          ? String(data.last_longitude)
          : '';

      if (midpointLat && midpointLng) {
        setValue(`trails.${index}.latitude`, midpointLat, { shouldDirty: true });
        setValue(`trails.${index}.longitude`, midpointLng, { shouldDirty: true });

        const currentLocation = watch(`trails.${index}.location`);
        if (!currentLocation?.trim()) {
          try {
            const { data: reverseData } = await apiClient.get<{ result?: { display_name?: string; address?: any } }>(
              `/api/geo/nominatim/reverse?lat=${encodeURIComponent(midpointLat)}&lon=${encodeURIComponent(midpointLng)}`
            );
            const address = reverseData?.result?.address || {};
            const city = address.city || address.town || address.village || address.state || '';
            const label =
              reverseData?.result?.display_name ||
              [address.road, address.suburb, city].filter(Boolean).join(', ');
            if (label) setValue(`trails.${index}.location`, label, { shouldDirty: true });
          } catch {
            // keep location empty if reverse geocode fails
          }
        }
      }
    } catch {
      setError('Failed to parse GPX file');
    } finally {
      setParsingGpxIndex(null);
    }
  };

  const clearGpxFile = (index: number) => {
    setGpxFiles((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setValue(`trails.${index}.distance_km`, '');
    setValue(`trails.${index}.elevation_gain_m`, '');
    setValue(`trails.${index}.estimated_time_hours`, '');
    setValue(`trails.${index}.latitude`, '');
    setValue(`trails.${index}.longitude`, '');
  };

  const clearAllGpxFiles = () => {
    for (let i = 0; i < fields.length; i += 1) {
      setValue(`trails.${i}.distance_km`, '');
      setValue(`trails.${i}.elevation_gain_m`, '');
      setValue(`trails.${i}.estimated_time_hours`, '');
      setValue(`trails.${i}.latitude`, '');
      setValue(`trails.${i}.longitude`, '');
    }
    setGpxFiles((prev) => prev.map(() => null));
    setStep(1);
  };

  const addFilesAsTrails = async (startIndex: number, files: File[]) => {
    if (files.length === 0) return;
    if (startIndex >= MAX_TRAILS_PER_UPLOAD) {
      setError(`You can upload up to ${MAX_TRAILS_PER_UPLOAD} trails at a time.`);
      return;
    }
    const allowedFiles = files.slice(0, MAX_TRAILS_PER_UPLOAD - startIndex);
    const limitMessage =
      allowedFiles.length < files.length
        ? `Only the first ${allowedFiles.length} file${allowedFiles.length === 1 ? '' : 's'} were added. You can upload up to ${MAX_TRAILS_PER_UPLOAD} trails at a time.`
        : null;
    if (allowedFiles.length < files.length) {
      setError(limitMessage);
    }
    ensureRowCount(startIndex + allowedFiles.length);
    for (let i = 0; i < allowedFiles.length; i += 1) {
      await processGpxFile(startIndex + i, allowedFiles[i]);
    }
    if (limitMessage) setError(limitMessage);
  };

  const handleGpxChange =
    (index: number): ChangeEventHandler<HTMLInputElement> => async (event) => {
      const files = Array.from(event.target.files || []).filter((file) =>
        file.name.toLowerCase().endsWith('.gpx')
      );
      if (files.length === 0) {
        setError('Please select valid .gpx files.');
        return;
      }
      await addFilesAsTrails(index, files);
    };

  const handleBulkGpxUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const firstEmptyIndex = gpxFiles.findIndex((file) => !file);
    const startIndex = firstEmptyIndex === -1 ? fields.length : firstEmptyIndex;
    await addFilesAsTrails(startIndex, files);
  };

  const getGpxFilesFromDrop = (items: FileList | null) => {
    if (!items || items.length === 0) return [];
    return Array.from(items).filter((file) => file.name.toLowerCase().endsWith('.gpx'));
  };

  const getRowsWithFiles = (formData?: FormValues) => {
    const source = formData?.trails || values || [];
    return source
      .map((trail, index) => ({ trail, file: gpxFiles[index], index }))
      .filter((row) => !!row.file);
  };

  const validateReviewStep = () => {
    const rows = getRowsWithFiles();
    if (rows.length === 0) {
      return 'Upload at least one GPX file to continue.';
    }
    const invalidRow = rows.find(({ trail }) => {
      return !trail.name?.trim() || !trail.location?.trim() || !trail.sport_type || !trail.difficulty;
    });
    if (invalidRow) {
      return `Please complete required fields for Trail ${invalidRow.index + 1} (name, location, sport, difficulty).`;
    }
    return null;
  };

  const handlePickTrailLocation = async (index: number, next: { lat: string; lng: string }) => {
    setValue(`trails.${index}.latitude`, next.lat, { shouldDirty: true });
    setValue(`trails.${index}.longitude`, next.lng, { shouldDirty: true });
    try {
      const { data } = await apiClient.get<{ result?: { display_name?: string; address?: any } }>(
        `/api/geo/nominatim/reverse?lat=${encodeURIComponent(next.lat)}&lon=${encodeURIComponent(next.lng)}`
      );
      const address = data?.result?.address || {};
      const city = address.city || address.town || address.village || address.state || '';
      const label =
        data?.result?.display_name ||
        [address.road, address.suburb, city].filter(Boolean).join(', ');
      if (label) setValue(`trails.${index}.location`, label, { shouldDirty: true });
    } catch {
      // keep manual location text
    }
  };

  const toggleSafetyLabel = (index: number, value: TrailSafetyLabel) => {
    const selected = values[index]?.safety_labels || [];
    const next = selected.includes(value)
      ? selected.filter((l) => l !== value)
      : [...selected, value];
    setValue(`trails.${index}.safety_labels`, next, { shouldDirty: true });
  };

  const handleImageUpload = async (index: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file for cover image.');
      return;
    }
    setUploadingImageIndex(index);
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 1200, quality: 0.86 });
      setValue(`trails.${index}.image_url`, dataUrl, { shouldDirty: true });
    } catch {
      setError('Failed to process cover image.');
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const handleGenerateDescription = async (index: number) => {
    const current = values[index];
    if (!current) return;
    if (!current.name?.trim() || !current.location?.trim() || !current.sport_type || !current.difficulty) {
      setError('Fill in trail name, location, sport type, and difficulty before generating.');
      return;
    }

    setError(null);
    setGeneratingIndex(index);
    try {
      const payload = {
        name: current.name,
        location: current.location,
        sport_type: current.sport_type,
        difficulty: current.difficulty,
        distance_km: current.distance_km,
        elevation_gain_m: current.elevation_gain_m,
        estimated_time_hours: current.estimated_time_hours,
      };
      const delays = [700, 1400, 2200];
      let data: { description?: string } | null = null;
      for (let attempt = 0; attempt <= delays.length; attempt += 1) {
        try {
          const result = await apiClient.post<{ description?: string }>('/api/ai/trail-description', payload);
          data = result.data;
          break;
        } catch (err: any) {
          if (err?.response?.status === 429 && attempt < delays.length) {
            await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
            continue;
          }
          throw err;
        }
      }
      if (data?.description) {
        setValue(`trails.${index}.description`, data.description, { shouldDirty: true });
      } else {
        setError('AI did not return a description.');
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setError('AI rate limit hit. Please wait a moment and try again.');
      } else {
        const serverMessage = err?.response?.data?.error;
        setError(
          typeof serverMessage === 'string' && serverMessage.trim()
            ? serverMessage
            : 'Failed to generate description. Please check the server AI configuration.'
        );
      }
    } finally {
      setGeneratingIndex(null);
    }
  };

  const onSubmit = async (formData: FormValues) => {
    setError(null);
    setNotice(null);

    const trails = formData.trails || [];
    const valid: { index: number; form: TrailCreateForm; file: File }[] = [];

    for (let i = 0; i < trails.length; i += 1) {
      const form = trails[i];
      const file = gpxFiles[i];
      if (!file) continue;
      if (!form.name?.trim() || !form.difficulty || !form.location?.trim() || !form.sport_type) continue;
      valid.push({ index: i + 1, form, file });
    }

    if (valid.length === 0) {
      setError('Add at least one trail with a GPX file and required fields (name, difficulty, location, sport type).');
      return;
    }

    setSubmitting(true);
    const results: { index: number; ok: boolean; id?: string; err?: string }[] = [];

    for (const { index, form, file } of valid) {
      try {
        const payload = new FormData();
        payload.append('name', form.name.trim());
        payload.append('description', (form.description || '').trim());
        payload.append('difficulty', form.difficulty);
        payload.append('sport_type', form.sport_type);
        payload.append('location', form.location.trim());
        payload.append('latitude', (form.latitude || '').trim());
        payload.append('longitude', (form.longitude || '').trim());
        payload.append('distance_km', (form.distance_km || '').trim());
        payload.append('elevation_gain_m', (form.elevation_gain_m || '').trim());
        payload.append('estimated_time_hours', (form.estimated_time_hours || '').trim());
        payload.append('komoot_embed_url', normalizeKomootEmbedInput(form.komoot_embed_url || ''));
        payload.append('image_url', (form.image_url || '').trim());
        payload.append(
          'trail_images',
          JSON.stringify((form.image_url || '').trim() ? [(form.image_url || '').trim()] : [])
        );
        payload.append('gpx_file', file);
        if (form.safety_labels?.length) {
          payload.append('safety_labels', JSON.stringify(form.safety_labels));
        }

        const { data } = await apiClient.post<{ trail: { id: string } }>(ApiPath.Trails, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        results.push({ index, ok: true, id: data.trail?.id });
      } catch (e) {
        let errorMessage = 'Failed to create trail';
        if (axios.isAxiosError(e)) {
          errorMessage =
            (e.response?.data as { error?: string } | undefined)?.error || e.message || errorMessage;
        } else if (e instanceof Error) {
          errorMessage = e.message;
        }
        results.push({ index, ok: false, err: errorMessage });
      }
    }

    setSubmitting(false);

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (failed.length === 0) {
      setNotice(
        succeeded.length === 1
          ? 'Trail created successfully.'
          : `${succeeded.length} trails created successfully.`
      );
      if (succeeded.length > 0 && onSuccess) {
        const first = succeeded[0];
        if (first.id) onSuccess({ trail: { id: first.id }, requiresApproval: !isAdmin });
      }
      reset({ trails: [createInitialForm()], acceptTerms: false });
      setGpxFiles([null]);
      setStep(1);
      return;
    }

    if (succeeded.length > 0) {
      setNotice(
        `${succeeded.length} trail(s) created. Some failed: ${failed
          .map((f) => `Trail ${f.index}: ${f.err}`)
          .join('; ')}`
      );
    } else {
      setError(failed.map((f) => `Trail ${f.index}: ${f.err}`).join('. '));
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400';

  const uploadedCount = gpxFiles.filter(Boolean).length;
  const reviewRows = getRowsWithFiles();

  const canGoToStep2 = uploadedCount > 0;
  const reviewValidationError = validateReviewStep();
  const canGoToStep3 = !reviewValidationError;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
          {notice}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {[
          { id: 1, title: 'Upload GPX' },
          { id: 2, title: 'Review' },
          { id: 3, title: 'Submit' },
        ].map((item) => {
          const active = step === item.id;
          const complete = step > item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 2 && !canGoToStep2) {
                  setError('Upload at least one GPX file to continue.');
                  return;
                }
                if (item.id === 3) {
                  if (!canGoToStep2) {
                    setError('Upload at least one GPX file to continue.');
                    return;
                  }
                  if (!canGoToStep3) {
                    setError(reviewValidationError || 'Please complete required fields before submitting.');
                    return;
                  }
                }
                setError(null);
                setStep(item.id as Step);
              }}
              disabled={(item.id === 2 && !canGoToStep2) || (item.id === 3 && (!canGoToStep2 || !canGoToStep3))}
              className={`rounded-lg px-3 py-2 text-left text-sm ${
                active
                  ? 'bg-green-600 text-white'
                  : complete
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide">Step {item.id}</span>
              <span className="font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Upload GPX files</h3>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Upload one or many GPX files. We auto-create one trail form for each file and prefill distance/elevation/time.
          </p>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingUpload(true);
            }}
            onDragLeave={() => setIsDraggingUpload(false)}
            onDrop={async (event) => {
              event.preventDefault();
              setIsDraggingUpload(false);
              const files = getGpxFilesFromDrop(event.dataTransfer.files);
              if (files.length === 0) {
                setError('Please drop valid .gpx files.');
                return;
              }
              await handleBulkGpxUpload(files);
            }}
            className={`rounded-lg border-2 border-dashed px-4 py-5 ${
              isDraggingUpload ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-slate-700'
            }`}
          >
            <input
              type="file"
              accept=".gpx"
              multiple
              onChange={async (event) => {
                const files = Array.from(event.target.files || []).filter((file) =>
                  file.name.toLowerCase().endsWith('.gpx')
                );
                if (files.length === 0) {
                  setError('Please select valid .gpx files.');
                  return;
                }
                await handleBulkGpxUpload(files);
              }}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Tip: You can upload up to {MAX_TRAILS_PER_UPLOAD} GPX files in one batch.
            </p>
            {parsingGpxIndex !== null && (
              <p className="mt-2 text-xs text-green-700 dark:text-green-300">Parsing GPX files...</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-800 dark:text-slate-100">Uploaded files: {uploadedCount}</p>
              {uploadedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllGpxFiles}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Clear all GPX files
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-2 text-gray-600 dark:text-slate-300">
              {gpxFiles.map((file, index) =>
                file ? (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-2 py-1.5 dark:border-slate-700">
                    <span className="truncate text-sm">Trail {index + 1}: {file.name}</span>
                    <button
                      type="button"
                      onClick={() => clearGpxFile(index)}
                      className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Clear
                    </button>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        </section>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {fields.map((field, index) => {
            if (!gpxFiles[index]) return null;
            return (
              <section
                key={field.id}
                className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Trail {index + 1}</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 dark:text-slate-400">
                      Replace GPX
                      <input type="file" accept=".gpx" onChange={handleGpxChange(index)} className="sr-only" />
                    </label>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTrail(index)}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Trail Name *</label>
                  <input {...register(`trails.${index}.name`, { required: true })} className={inputClass} placeholder="Trail name" />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Difficulty *</label>
                    <select {...register(`trails.${index}.difficulty`)} className={inputClass}>
                      {TRAIL_DIFFICULTY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Sport Type *</label>
                    <select {...register(`trails.${index}.sport_type`)} className={inputClass}>
                      {TRAIL_SPORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Location *</label>
                  <input {...register(`trails.${index}.location`, { required: true })} className={inputClass} placeholder="City / region" />
                  <input type="hidden" {...register(`trails.${index}.latitude`)} />
                  <input type="hidden" {...register(`trails.${index}.longitude`)} />
                  <div className="mt-3">
                    <StoreLocationPicker
                      lat={watch(`trails.${index}.latitude`) || ''}
                      lng={watch(`trails.${index}.longitude`) || ''}
                      onChange={(next) => {
                        void handlePickTrailLocation(index, next);
                      }}
                    />
                  </div>
                </div>

                <details className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-slate-200">
                    Optional details
                  </summary>
                  <div className="mt-3 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                        Cover Image (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className={inputClass}
                        onChange={async (event) => {
                          const file = event.target.files?.[0] || null;
                          await handleImageUpload(index, file);
                          if (event.target) event.target.value = '';
                        }}
                      />
                      {uploadingImageIndex === index && (
                        <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                          Processing image...
                        </p>
                      )}
                      {values[index]?.image_url?.trim() && (
                        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="truncate text-xs font-medium text-gray-600 dark:text-slate-300">
                              Cover image selected
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setValue(`trails.${index}.image_url`, '', { shouldDirty: true });
                              }}
                              className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                            >
                              Remove image
                            </button>
                          </div>
                          <div className="relative h-28 w-full overflow-hidden rounded-md">
                            <Image
                              src={values[index].image_url}
                              alt={`Trail ${index + 1} cover preview`}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, 420px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Description</label>
                        <button
                          type="button"
                          onClick={() => handleGenerateDescription(index)}
                          disabled={
                            generatingIndex === index ||
                            !values[index]?.name?.trim() ||
                            !values[index]?.location?.trim() ||
                            !values[index]?.sport_type ||
                            !values[index]?.difficulty
                          }
                          className="text-xs font-semibold text-green-700 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {generatingIndex === index ? 'Generating...' : 'Generate with AI'}
                        </button>
                      </div>
                      <textarea {...register(`trails.${index}.description`)} rows={3} className={inputClass} placeholder="Trail description" />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Distance (km)</label>
                        <input type="number" step="any" {...register(`trails.${index}.distance_km`)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Elevation Gain (m)</label>
                        <input type="number" step="any" {...register(`trails.${index}.elevation_gain_m`)} className={inputClass} />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Estimated Time (hours)</label>
                        <input type="number" step="any" {...register(`trails.${index}.estimated_time_hours`)} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Komoot embed URL</label>
                      <input type="text" {...register(`trails.${index}.komoot_embed_url`)} className={inputClass} placeholder="Paste Komoot embed URL or iframe code" />
                      {values[index]?.komoot_embed_url?.trim() && (
                        <p
                          className={`mt-2 text-xs ${
                            isKomootEmbedUrl(normalizeKomootEmbedInput(values[index].komoot_embed_url || ''))
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {isKomootEmbedUrl(normalizeKomootEmbedInput(values[index].komoot_embed_url || ''))
                            ? 'Komoot embed link detected.'
                            : "This doesn’t look like a Komoot embed link. Use Share → Embed."}
                        </p>
                      )}
                    </div>

                    {canEditSafetyLabels && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Safety Labels</p>
                        <div className="flex flex-wrap gap-2">
                          {TRAIL_SAFETY_OPTIONS.map((option) => {
                            const selected = (values[index]?.safety_labels || []).includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleSafetyLabel(index, option.value)}
                                className={`rounded-full border px-3 py-1 text-sm ${
                                  selected
                                    ? 'border-green-600 bg-green-600 text-white'
                                    : 'border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </section>
            );
          })}
        </div>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Ready to submit</h3>
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-gray-700 dark:text-slate-200">Trails to submit: {reviewRows.length}</p>
            <p className="text-gray-500 dark:text-slate-400">All required fields must be completed before submission.</p>
          </div>

          <div className="flex flex-col gap-2 text-xs text-gray-600 dark:text-slate-300">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                {...register('acceptTerms', { required: true })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span>I confirm these trail details are accurate and ready for review.</span>
            </label>
            {errors.acceptTerms && (
              <span className="text-xs text-red-600 dark:text-red-300">Please acknowledge before submitting trails.</span>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1) as Step)}
          disabled={step === 1 || submitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                if (uploadedCount === 0) {
                  setError('Upload at least one GPX file to continue.');
                  return;
                }
                setStep(2);
                return;
              }
              const reviewError = validateReviewStep();
              if (reviewError) {
                setError(reviewError);
                return;
              }
              setStep(3);
            }}
            disabled={submitting || parsingGpxIndex !== null}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting || parsingGpxIndex !== null || !acceptTerms}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
