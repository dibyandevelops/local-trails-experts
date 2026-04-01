'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import type { SportType, User } from '@/types';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { resizeImageToDataUrl } from '@/lib/image';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export default function ParticipantOnboardingModal({
  open,
  onOpenChange,
  user,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onCompleted: (user: User) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [form, setForm] = useState({
    name: user.name || '',
    sports: (user.sports || []) as SportType[],
    availability_weekdays: (user.availability_weekdays || []) as string[],
    city: user.city || '',
    phone: user.phone || '',
    profile_photo_url: user.profile_photo_url || '',
  });

  const initials = useMemo(
    () =>
      (user.name || user.email || 'P')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
    [user.name, user.email]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.sports.length === 0) {
      setError('Please select at least one sport.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!acceptTerms) {
      setError('Please accept terms and privacy policy.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || null,
          sports: form.sports,
          availability_weekdays: form.availability_weekdays,
          city: form.city.trim() || null,
          phone: form.phone.trim(),
          profile_photo_url: form.profile_photo_url || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        throw new Error(data?.error || 'Failed to save profile details.');
      }
      onCompleted(data.user as User);
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
            Complete your profile
          </Dialog.Title>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Help us personalize trails and event recommendations.
          </p>

          <form className="mt-4 space-y-4" onSubmit={submit}>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {form.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.profile_photo_url}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Upload photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploadingPhoto(true);
                    try {
                      const dataUrl = await resizeImageToDataUrl(file, {
                        maxDimension: 512,
                        quality: 0.78,
                      });
                      setForm((prev) => ({ ...prev, profile_photo_url: dataUrl }));
                    } catch {
                      setError('Unable to process selected image.');
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }}
                  className="block w-full text-sm text-gray-700 dark:text-slate-200 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-50 dark:file:border-slate-700 dark:file:bg-slate-900 dark:file:text-slate-100 dark:hover:file:bg-slate-800"
                />
                {uploadingPhoto && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Processing photo...</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Full name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="+9779812345678"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Your city"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Interested sports
              </label>
              <div className="flex flex-wrap gap-2">
                {TRAIL_SPORTS.map((sport) => {
                  const selected = form.sports.includes(sport.value);
                  return (
                    <button
                      key={sport.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          sports: selected
                            ? prev.sports.filter((value) => value !== sport.value)
                            : [...prev.sports, sport.value],
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        selected
                          ? 'border-green-700 bg-green-700 text-white'
                          : 'border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {sport.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Free weekdays
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = form.availability_weekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          availability_weekdays: selected
                            ? prev.availability_weekdays.filter((value) => value !== day)
                            : [...prev.availability_weekdays, day],
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        selected
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : 'border-gray-300 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
              <input
                id="onboarding-accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="onboarding-accept-terms">
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

            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Later
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save details'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
