'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import type { Difficulty, SportType, Trail } from '@/types';
import { TRAIL_SAFETY_OPTIONS, type TrailSafetyLabel } from '@/lib/trail-safety';
import { DEFAULT_TRAIL_SPORT, TRAIL_SPORTS } from '@/services/constants/sports';
import { fetchTrailById, updateTrail, uploadTrailRoute } from '@/services/trails/trails.service';
import { QUERY_KEYS } from '@/services/constants/query-keys';

type FormValues = {
  name: string;
  description: string;
  difficulty: Difficulty;
  sport_type: SportType;
  location: string;
  distance_km: string;
  elevation_gain_m: string;
  estimated_time_hours: string;
  safety_labels: TrailSafetyLabel[];
};

function toStringOrEmpty(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export default function TrailEditForm({ trailId }: { trailId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const gpxInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingGpx, setPendingGpx] = useState<File | null>(null);
  const [trailImages, setTrailImages] = useState<string[]>([]);

  const { data: trail, isLoading } = useQuery<Trail>({
    queryKey: QUERY_KEYS.trails.byId(trailId),
    queryFn: ({ signal }) => fetchTrailById(trailId, signal),
    enabled: Boolean(trailId),
  });

  const defaultValues = useMemo<FormValues>(() => {
    return {
      name: trail?.name ?? '',
      description: trail?.description ?? '',
      difficulty: trail?.difficulty ?? 'easy',
      sport_type: (trail?.sport_type as SportType) ?? DEFAULT_TRAIL_SPORT,
      location: trail?.location ?? '',
      distance_km: toStringOrEmpty(trail?.distance_km),
      elevation_gain_m: toStringOrEmpty(trail?.elevation_gain_m),
      estimated_time_hours: toStringOrEmpty(trail?.estimated_time_hours),
      safety_labels: (trail?.safety_labels as TrailSafetyLabel[] | null) ?? [],
    };
  }, [trail]);

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>({
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!trail) return;
    const list = [
      ...(Array.isArray(trail.trail_images) ? trail.trail_images : []),
      trail.image_url,
    ].filter((value): value is string => Boolean(value));
    setTrailImages(Array.from(new Set(list)));
  }, [trail?.id]);

  const safetyLabels = watch('safety_labels') || [];

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Trail>) => updateTrail(trailId, payload),
    onSuccess: async (nextTrail) => {
      setNotice('Trail updated.');
      setError(null);
      queryClient.setQueryData(QUERY_KEYS.trails.byId(trailId), nextTrail);
      await queryClient.invalidateQueries({ queryKey: ['trails'] });
      await queryClient.invalidateQueries({ queryKey: ['trails-paginated'] });
      await queryClient.invalidateQueries({ queryKey: ['trails-infinite'] });
    },
    onError: (e) => {
      setNotice(null);
      setError(e instanceof Error ? e.message : 'Failed to update trail.');
    },
  });

  const uploadRouteMutation = useMutation({
    mutationFn: (file: File) => uploadTrailRoute(trailId, file),
    onSuccess: (nextTrail) => {
      queryClient.setQueryData(QUERY_KEYS.trails.byId(trailId), nextTrail);
      setValue('distance_km', toStringOrEmpty(nextTrail.distance_km));
      setValue('elevation_gain_m', toStringOrEmpty(nextTrail.elevation_gain_m));
      setValue('estimated_time_hours', toStringOrEmpty(nextTrail.estimated_time_hours));
      setNotice('GPX route replaced.');
      setError(null);
    },
    onError: (e) => {
      setNotice(null);
      setError(e instanceof Error ? e.message : 'Failed to upload GPX route.');
    },
  });

  const toggleSafetyLabel = (value: TrailSafetyLabel) => {
    const next = safetyLabels.includes(value)
      ? safetyLabels.filter((l) => l !== value)
      : [...safetyLabels, value];
    setValue('safety_labels', next, { shouldDirty: true });
  };

  const onSubmit = (values: FormValues) => {
    setError(null);
    setNotice(null);

    updateMutation.mutate({
      name: values.name.trim(),
      description: (values.description || '').trim() || null,
      difficulty: values.difficulty,
      sport_type: values.sport_type,
      location: values.location.trim(),
      // distance_km is derived from GPX; keep read-only on the form.
      elevation_gain_m: values.elevation_gain_m ? Number(values.elevation_gain_m) : null,
      estimated_time_hours: values.estimated_time_hours ? Number(values.estimated_time_hours) : null,
      image_url: trailImages[0] || null,
      trail_images: trailImages,
      safety_labels: values.safety_labels || [],
    });
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">Loading trail...</p>;
  }

  if (!trail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        Trail not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-900">Replace GPX route (optional)</p>
          <p className="text-xs text-gray-600">
            Uploading a new GPX will overwrite the existing route data for this trail.
          </p>
        </div>

        <div className="mt-3">
          <input
            ref={gpxInputRef}
            type="file"
            accept=".gpx"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (!file) return;
              setPendingGpx(file);
              setConfirmOpen(true);
            }}
            className="block w-full text-sm"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Trail name</label>
          <input
            {...register('name', { required: true })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
            placeholder="Trail name"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sport type</label>
            <select
              {...register('sport_type', { required: true })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
            >
              {TRAIL_SPORTS.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Difficulty</label>
            <select
              {...register('difficulty', { required: true })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
          <input
            {...register('location', { required: true })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
            placeholder="City / area"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Distance (km)</label>
            <input
              {...register('distance_km')}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Elevation gain (m)</label>
            <input
              {...register('elevation_gain_m')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estimated time (hours)</label>
            <input
              {...register('estimated_time_hours')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              inputMode="decimal"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
            placeholder="Short trail overview..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Trail photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (event) => {
              const files = Array.from(event.target.files || []);
              if (files.length === 0) return;
              setError(null);
              try {
                const next = await Promise.all(files.map((f) => fileToDataUrl(f)));
                setTrailImages((prev) => Array.from(new Set([...prev, ...next].filter(Boolean))));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to process images');
              } finally {
                // allow selecting the same file again
                event.currentTarget.value = '';
              }
            }}
            className="block w-full text-sm"
          />
          {trailImages.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {trailImages.slice(0, 8).map((src, index) => (
                <div
                  key={`trail-edit-img-${index}`}
                  className="relative h-20 w-24 overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Trail photo ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setTrailImages((prev) => prev.filter((_, i) => i !== index));
                    }}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-black/70"
                    aria-label="Remove photo"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {trailImages.length > 8 && (
                <div className="grid h-20 w-24 place-items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-600">
                  +{trailImages.length - 8} more
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Add at least one photo to use it as the cover image.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Safety labels</p>
          <div className="flex flex-wrap gap-2">
            {TRAIL_SAFETY_OPTIONS.map((opt) => {
              const selected = safetyLabels.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSafetyLabel(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    selected
                      ? 'border-amber-500 bg-amber-100 text-amber-900'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            disabled={updateMutation.isPending || uploadRouteMutation.isPending}
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
                return;
              }
              router.push(`/trails/${trailId}`);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending || uploadRouteMutation.isPending}
            className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              Replace GPX route?
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-600">
              This will overwrite the existing route data for this trail.
            </Dialog.Description>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={() => {
                    setPendingGpx(null);
                    if (gpxInputRef.current) gpxInputRef.current.value = '';
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={!pendingGpx || uploadRouteMutation.isPending}
                onClick={async () => {
                  if (!pendingGpx) return;
                  await uploadRouteMutation.mutateAsync(pendingGpx);
                  setPendingGpx(null);
                  if (gpxInputRef.current) gpxInputRef.current.value = '';
                  setConfirmOpen(false);
                }}
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadRouteMutation.isPending ? 'Replacing...' : 'Replace'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
