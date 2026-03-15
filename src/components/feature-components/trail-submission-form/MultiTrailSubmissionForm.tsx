'use client';

import { ChangeEventHandler, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import type { Difficulty, SportType, UserRole } from '@/types';
import {
  DEFAULT_TRAIL_SAFETY_LABELS,
  TRAIL_SAFETY_OPTIONS,
  TrailSafetyLabel,
} from '@/lib/trail-safety';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS } from '@/services/constants/sports';
import { apiClient } from '@/services/api/client';
import { ApiPath } from '@/services/api/paths';

const MAX_TRAILS = 5;

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

const createInitialForm = (): TrailCreateForm => ({
  name: '',
  description: '',
  difficulty: 'easy',
  sport_type: DEFAULT_TRAIL_SPORT,
  location: '',
  distance_km: '',
  elevation_gain_m: '',
  estimated_time_hours: '',
  image_url: '',
  safety_labels: [...DEFAULT_TRAIL_SAFETY_LABELS],
});

type TrailFiles = {
  gpxFile: File | null;
  trailImages: string[];
};

type Props = {
  userRole: UserRole;
  onSuccess?: (data: { trail: { id: string }; requiresApproval?: boolean }) => void;
  submitLabel?: string;
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

export default function MultiTrailSubmissionForm({
  userRole,
  onSuccess,
  submitLabel = 'Create Trails',
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [parsingGpxIndex, setParsingGpxIndex] = useState<number | null>(null);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [trailFiles, setTrailFiles] = useState<TrailFiles[]>([{ gpxFile: null, trailImages: [] }]);

  const isAdmin = userRole === 'admin';

  const { register, control, handleSubmit, setValue, watch, reset } = useForm<{ trails: TrailCreateForm[] }>({
    defaultValues: { trails: [createInitialForm()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'trails' });
  const values = watch('trails') || [];

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

  const canAddMore = fields.length < MAX_TRAILS;

  const addTrail = () => {
    if (!canAddMore) return;
    append(createInitialForm());
    setTrailFiles((prev) => [...prev, { gpxFile: null, trailImages: [] }]);
  };

  const removeTrail = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
    setTrailFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const setTrailFile = (index: number, updater: (prev: TrailFiles) => TrailFiles) => {
    setTrailFiles((prev) => {
      const next = [...prev];
      next[index] = updater(next[index] ?? { gpxFile: null, trailImages: [] });
      return next;
    });
  };

  const handleGpxChange = (index: number): ChangeEventHandler<HTMLInputElement> => async (event) => {
    const file = event.target.files?.[0] || null;
    setTrailFile(index, () => ({ gpxFile: file, trailImages: trailFiles[index]?.trailImages ?? [] }));
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
    } catch {
      setError('Failed to parse GPX file');
    } finally {
      setParsingGpxIndex(null);
    }
  };

  const handleTrailImagesChange = (index: number): ChangeEventHandler<HTMLInputElement> => async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setTrailFile(index, (p) => ({ ...p, trailImages: [] }));
      return;
    }
    try {
      const images = await Promise.all(files.map((file) => fileToDataUrl(file)));
      setTrailFile(index, (p) => ({ ...p, trailImages: images }));
      const current = values[index];
      if (current && !current.image_url && images[0]) {
        setValue(`trails.${index}.image_url`, images[0]);
      }
    } catch {
      setError('Failed to process trail images');
    }
  };

  const toggleSafetyLabel = (index: number, value: TrailSafetyLabel) => {
    const selected = values[index]?.safety_labels || [];
    const next = selected.includes(value)
      ? selected.filter((l) => l !== value)
      : [...selected, value];
    setValue(`trails.${index}.safety_labels`, next, { shouldDirty: true });
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
          const result = await apiClient.post<{ description?: string }>(
            '/api/ai/trail-description',
            payload
          );
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
        return;
      }
      setError('Failed to generate description.');
    } finally {
      setGeneratingIndex(null);
    }
  };

  const onSubmit = async (formData: { trails: TrailCreateForm[] }) => {
    setError(null);
    setNotice(null);
    const trails = formData.trails || [];
    const valid: { index: number; form: TrailCreateForm; files: TrailFiles }[] = [];
    for (let i = 0; i < trails.length; i++) {
      const form = trails[i];
      const files = trailFiles[i];
      if (!files?.gpxFile) continue;
      if (!form.name?.trim() || !form.difficulty || !form.location?.trim() || !form.sport_type) continue;
      valid.push({ index: i + 1, form, files });
    }
    if (valid.length === 0) {
      setError('Add at least one trail with a GPX file and required fields (name, difficulty, location, sport type).');
      return;
    }
    setSubmitting(true);
    const results: { index: number; ok: boolean; id?: string; err?: string }[] = [];
    for (const { index, form, files } of valid) {
      try {
        const payload = new FormData();
        payload.append('name', form.name.trim());
        payload.append('description', (form.description || '').trim());
        payload.append('difficulty', form.difficulty);
        payload.append('sport_type', form.sport_type);
        payload.append('location', form.location.trim());
        payload.append('distance_km', (form.distance_km || '').trim());
        payload.append('elevation_gain_m', (form.elevation_gain_m || '').trim());
        payload.append('estimated_time_hours', (form.estimated_time_hours || '').trim());
        payload.append('image_url', (form.image_url || '').trim());
        payload.append('trail_images', JSON.stringify(files.trailImages || []));
        payload.append('gpx_file', files.gpxFile as File);
        if (form.safety_labels?.length) {
          payload.append('safety_labels', JSON.stringify(form.safety_labels));
        }
        const { data } = await apiClient.post<{ trail: { id: string }; requiresApproval?: boolean }>(
          ApiPath.Trails,
          payload,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        results.push({ index, ok: true, id: data.trail?.id });
      } catch (e) {
        results.push({ index, ok: false, err: e instanceof Error ? e.message : 'Failed to create trail' });
      }
    }
    setSubmitting(false);
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      setNotice(
        succeeded.length === 1
          ? (isAdmin ? 'Trail created successfully.' : 'Trail submitted. Waiting for admin approval.')
          : `${succeeded.length} trails created successfully.`
      );
      if (succeeded.length > 0 && onSuccess) {
        const first = succeeded[0];
        if (first.id) {
          onSuccess({ trail: { id: first.id }, requiresApproval: !isAdmin });
        }
      }
      reset({ trails: [createInitialForm()] });
      setTrailFiles([{ gpxFile: null, trailImages: [] }]);
      return;
    }
    if (succeeded.length > 0) {
      setNotice(`${succeeded.length} trail(s) created. Some failed: ${failed.map((f) => `Trail ${f.index}: ${f.err}`).join('; ')}`);
    } else {
      setError(failed.map((f) => `Trail ${f.index}: ${f.err}`).join('. '));
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400';

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

      {fields.map((field, index) => (
        <section
          key={field.id}
          className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
              Trail {index + 1}
            </h3>
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => removeTrail(index)}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
              >
                Remove this trail
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              GPX File
            </label>
            <input
              type="file"
              accept=".gpx"
              onChange={handleGpxChange(index)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Uploading a GPX file will auto-fill other fields.
            </p>
            {parsingGpxIndex === index && (
              <p className="text-xs text-green-700 mt-1 dark:text-green-300">
                Parsing GPX...
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Trail Name
            </label>
            <input
              {...register(`trails.${index}.name`, { required: true })}
              className={inputClass}
              placeholder="Trail name"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                Description
              </label>
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
            <textarea
              {...register(`trails.${index}.description`)}
              rows={3}
              className={inputClass}
              placeholder="Trail description"
            />
            {(!values[index]?.name?.trim() ||
              !values[index]?.location?.trim() ||
              !values[index]?.sport_type ||
              !values[index]?.difficulty) && (
              <p className="mt-1 text-xs text-gray-500">
                Fill in trail name, location, sport type, and difficulty to enable AI.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Difficulty
              </label>
              <select {...register(`trails.${index}.difficulty`)} className={inputClass}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Sport Type
              </label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Location
            </label>
            <input
              {...register(`trails.${index}.location`, { required: true })}
              className={inputClass}
              placeholder="City / region"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Trail Pictures
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleTrailImagesChange(index)}
              className={inputClass}
            />
            {(trailFiles[index]?.trailImages?.length ?? 0) > 0 && (
              <p className="text-xs text-gray-600 mt-1 dark:text-slate-400">
                {trailFiles[index].trailImages.length} image(s) selected
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Distance (km)
              </label>
              <input
                type="number"
                step="any"
                {...register(`trails.${index}.distance_km`)}
                readOnly
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Elevation Gain (m)
              </label>
              <input
                type="number"
                step="any"
                {...register(`trails.${index}.elevation_gain_m`)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Estimated Time (hours)
              </label>
              <input
                type="number"
                step="any"
                {...register(`trails.${index}.estimated_time_hours`)}
                className={inputClass}
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">
                Safety Labels (Admin)
              </p>
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
        </section>
      ))}

      {canAddMore && (
        <button
          type="button"
          onClick={addTrail}
          className="w-full rounded-lg border-2 border-dashed border-green-500 py-3 text-sm font-medium text-green-700 hover:bg-green-50 dark:text-green-200 dark:hover:bg-green-950/40"
        >
          Add another trail
        </button>
      )}
      {!canAddMore && (
        <p className="text-sm text-gray-500 text-center dark:text-slate-400">
          Maximum {MAX_TRAILS} trails per submission. Submit to create these, then you can add more.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || parsingGpxIndex !== null}
        className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-70"
      >
        {submitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
}
