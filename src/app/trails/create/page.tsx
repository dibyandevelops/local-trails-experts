'use client';

import { ChangeEventHandler, FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/types';
import { TRAIL_SAFETY_OPTIONS, TrailSafetyLabel } from '@/lib/trail-safety';
import { useCurrentUser } from '@/hooks/use-current-user';

type TrailCreateForm = {
  name: string;
  description: string;
  difficulty: Difficulty;
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
  location: '',
  distance_km: '',
  elevation_gain_m: '',
  estimated_time_hours: '',
  image_url: '',
  safety_labels: [],
};

export default function CreateTrailPage() {
  const router = useRouter();
  const { data: user = null, isLoading: loadingUser } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [parsingGpx, setParsingGpx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TrailCreateForm>(INITIAL_FORM);
  const [gpxFile, setGpxFile] = useState<File | null>(null);

  const canCreate = user?.role === 'admin' || user?.role === 'expert';
  const isAdmin = user?.role === 'admin';

  const parsedPayload = useMemo(
    () => ({
      name: form.name.trim(),
      description: form.description.trim(),
      difficulty: form.difficulty,
      location: form.location.trim(),
      distance_km: form.distance_km.trim(),
      elevation_gain_m: form.elevation_gain_m.trim(),
      estimated_time_hours: form.estimated_time_hours.trim(),
      image_url: form.image_url.trim(),
      safety_labels: isAdmin ? form.safety_labels : undefined,
    }),
    [form, isAdmin]
  );

  const toggleSafetyLabel = (value: TrailSafetyLabel) => {
    setForm((prev) => ({
      ...prev,
      safety_labels: prev.safety_labels.includes(value)
        ? prev.safety_labels.filter((label) => label !== value)
        : [...prev.safety_labels, value],
    }));
  };

  const handleGpxChange: ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0] || null;
    setGpxFile(file);
    setError(null);
    setForm((prev) => ({
      ...prev,
      distance_km: '',
      elevation_gain_m: '',
      estimated_time_hours: '',
    }));

    if (!file) return;

    setParsingGpx(true);
    try {
      const formData = new FormData();
      formData.append('gpx_file', file);
      const response = await fetch('/api/trails/parse-gpx', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to parse GPX file');
        return;
      }

      setForm((prev) => ({
        ...prev,
        distance_km: String(data.distance_km ?? ''),
        elevation_gain_m: String(data.elevation_gain_m ?? ''),
        estimated_time_hours: String(data.estimated_time_hours ?? ''),
      }));
    } catch {
      setError('Failed to parse GPX file');
    } finally {
      setParsingGpx(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;
    if (!gpxFile) {
      setError('GPX file is required.');
      return;
    }
    if (parsingGpx) {
      setError('Please wait until GPX parsing is complete.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', parsedPayload.name);
      formData.append('description', parsedPayload.description);
      formData.append('difficulty', parsedPayload.difficulty);
      formData.append('location', parsedPayload.location);
      formData.append('distance_km', parsedPayload.distance_km);
      formData.append('elevation_gain_m', parsedPayload.elevation_gain_m);
      formData.append(
        'estimated_time_hours',
        parsedPayload.estimated_time_hours
      );
      formData.append('image_url', parsedPayload.image_url);
      formData.append('gpx_file', gpxFile);
      if (isAdmin) {
        formData.append(
          'safety_labels',
          JSON.stringify(parsedPayload.safety_labels || [])
        );
      }

      const response = await fetch('/api/trails', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create trail');
        return;
      }

      router.push(`/trails/${data.trail.id}`);
    } catch {
      setError('Failed to create trail');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-green-800">Create Trail</h1>

      {loadingUser ? (
        <p className="text-gray-600">Loading user...</p>
      ) : !canCreate ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Only admin users can create trails.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              placeholder="Trail name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              placeholder="Trail summary and highlights"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Difficulty <span className="text-red-500">*</span>
              </label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    difficulty: e.target.value as Difficulty,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
                placeholder="City / region"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              GPX Route File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".gpx"
              required
              onChange={handleGpxChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-green-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-green-700"
            />
            <p className="mt-1 text-xs text-gray-500">
              We derive route points and coordinates from this GPX.
            </p>
            {parsingGpx && (
              <p className="mt-1 text-xs text-green-700">Parsing GPX...</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Distance (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.distance_km}
                readOnly
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Elevation Gain (m)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.elevation_gain_m}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, elevation_gain_m: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Estimated Time (hours)</label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={form.estimated_time_hours}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, estimated_time_hours: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Image URL</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, image_url: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
          </div>

          {isAdmin && (
            <div>
              <p className="mb-2 text-sm font-medium">Safety Labels (Admin)</p>
              <div className="flex flex-wrap gap-2">
                {TRAIL_SAFETY_OPTIONS.map((option) => {
                  const selected = form.safety_labels.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleSafetyLabel(option.value)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selected
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || parsingGpx}
              className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Creating...' : 'Create Trail'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/trails')}
              className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
