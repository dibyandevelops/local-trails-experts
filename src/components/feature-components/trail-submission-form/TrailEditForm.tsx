'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import type { Difficulty, SportType, Trail } from '@/types';
import {
  DEFAULT_TRAIL_SAFETY_LABELS,
  TRAIL_SAFETY_OPTIONS,
  type TrailSafetyLabel,
} from '@/lib/trail-safety';
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
  komoot_embed_url: string;
  safety_labels: TrailSafetyLabel[];
  acceptTerms: boolean;
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
      komoot_embed_url: trail?.komoot_embed_url ?? '',
      safety_labels:
        (trail?.safety_labels && trail.safety_labels.length > 0
          ? (trail.safety_labels as TrailSafetyLabel[])
          : DEFAULT_TRAIL_SAFETY_LABELS) ?? [],
      acceptTerms: false,
    };
  }, [trail]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
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
  const acceptTerms = watch('acceptTerms');
  const komootValue = watch('komoot_embed_url') || '';
  const komootPreviewUrl = normalizeKomootEmbedInput(komootValue);
  const komootLooksValid = komootPreviewUrl ? isKomootEmbedUrl(komootPreviewUrl) : true;

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Trail>) => updateTrail(trailId, payload),
    onSuccess: async (nextTrail) => {
      setNotice('Trail updated.');
      setError(null);
      queryClient.setQueryData(QUERY_KEYS.trails.byId(trailId), nextTrail);
      await queryClient.invalidateQueries({ queryKey: ['trails'] });
      await queryClient.invalidateQueries({ queryKey: ['trails-paginated'] });
      await queryClient.invalidateQueries({ queryKey: ['trails-infinite'] });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.pendingTrails });

      // Return to the page the admin came from (pending list, trail details, etc.).
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push(`/trails/${trailId}`);
      }
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
      komoot_embed_url: normalizeKomootEmbedInput(values.komoot_embed_url) || null,
      safety_labels: values.safety_labels || [],
    });
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600 dark:text-slate-300">Loading trail...</p>;
  }

  if (!trail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        Trail not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Replace GPX route (optional)
          </p>
          <p className="text-xs text-gray-600 dark:text-slate-400">
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
            className="block w-full text-sm text-gray-700 dark:text-slate-200"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
            Replacing GPX will auto-fill distance and elevation fields.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
            Trail name
          </label>
          <input
            {...register('name', { required: true })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Trail name"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Sport type
            </label>
            <select
              {...register('sport_type', { required: true })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {TRAIL_SPORTS.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Difficulty
            </label>
            <select
              {...register('difficulty', { required: true })}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
            Location
          </label>
          <input
            {...register('location', { required: true })}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="City / area"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Distance (km)
            </label>
            <input
              {...register('distance_km')}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Elevation gain (m)
            </label>
            <input
              {...register('elevation_gain_m')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Estimated time (hours)
            </label>
            <input
              {...register('estimated_time_hours')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              inputMode="decimal"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Komoot embed URL (optional)
            </label>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="Where to find Komoot embed code"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                i
              </button>
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] text-emerald-900 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-emerald-900/60 dark:bg-slate-950 dark:text-emerald-100">
                Open the route in Komoot → Share → Embed → copy the embed URL or iframe.
              </span>
            </span>
          </div>
          <input
            {...register('komoot_embed_url')}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Paste Komoot embed URL or iframe code"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Use Share → Embed in Komoot to get the embed code or URL.
          </p>
          {komootPreviewUrl && (
            <p
              className={`mt-2 text-xs ${
                komootLooksValid
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {komootLooksValid
                ? 'Komoot embed link detected.'
                : 'This doesn’t look like a Komoot embed link. Use Share → Embed.'}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Short trail overview..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
            Trail photos
          </label>
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
                if(event?.currentTarget) event.currentTarget.value = '';
              }
            }}
            className="block w-full text-sm text-gray-700 dark:text-slate-200"
          />
          {trailImages.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {trailImages.slice(0, 8).map((src, index) => (
                <div
                  key={`trail-edit-img-${index}`}
                  className="relative h-20 w-24 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900"
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
                <div className="grid h-20 w-24 place-items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  +{trailImages.length - 8} more
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Add at least one photo to use it as the cover image.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">
            Safety labels
          </p>
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
                      ? 'border-amber-500 bg-amber-100 text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex w-full flex-col gap-2 sm:mr-auto sm:w-auto">
            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
              <input
                type="checkbox"
                {...register('acceptTerms', { required: true })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span>
                I confirm this trail data is accurate and safe to publish.
              </span>
            </label>
            {errors.acceptTerms && (
              <span className="text-xs text-red-600 dark:text-red-300">
                Please acknowledge before updating the trail.
              </span>
            )}
          </div>
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
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending || uploadRouteMutation.isPending || !acceptTerms}
            className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {updateMutation.isPending ? 'Updating...' : 'Update trail'}
          </button>
        </div>
      </form>

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Replace GPX route?
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-400">
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
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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
