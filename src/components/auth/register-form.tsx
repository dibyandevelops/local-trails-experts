'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SportType } from '@/types';
import { TRAIL_SPORTS } from '@/services/constants/sports';
import { resizeImageToDataUrl } from '@/lib/image';

export default function RegisterForm({
  embedded = false,
  notice: initialNotice = null,
  next = '/',
  onRegistered,
}: {
  embedded?: boolean;
  notice?: string | null;
  next?: string;
  onRegistered?: () => void;
}) {
  const router = useRouter();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    sports: [] as SportType[],
    password: '',
    phone: '',
    city: '',
    profilePhotoUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: form.password.length >= 8,
      number: /\d/.test(form.password),
    }),
    [form.password]
  );

  const validatePassword = () => {
    if (!passwordChecks.length) return 'Password must be at least 8 characters.';
    if (!passwordChecks.number) return 'Password must include at least one number.';
    return null;
  };

  const validateForm = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      return 'Full name, email, and phone number are required.';
    }
    if (form.sports.length === 0) {
      return 'Please select at least one sport.';
    }
    if (!acceptTerms) {
      return 'Please accept the terms and privacy policy.';
    }
    return validatePassword();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          sports: form.sports,
          password: form.password,
          phone: form.phone.trim(),
          city: form.city.trim() || null,
          profile_photo_url: form.profilePhotoUrl || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to register.');
      }

      setSuccess('Account created! You are now signed in.');
      window.dispatchEvent(new Event('auth-changed'));
      onRegistered?.();
      setForm({
        name: '',
        email: '',
        sports: [],
        password: '',
        phone: '',
        city: '',
        profilePhotoUrl: '',
      });
      router.push(next || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  const initials =
    form.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P';

  return (
    <div className={embedded ? '' : 'max-w-lg mx-auto'}>
      <h1 className="text-4xl font-bold mb-2 text-green-800 dark:text-green-200">
        Join the Adventure!
      </h1>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl dark:text-slate-300">
        Create your free account to unlock trails, connect with verified guides and coaches,
        and never miss an event.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4 dark:bg-slate-900 dark:border-slate-700"
      >
        {notice && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-200">
            {notice}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {form.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.profilePhotoUrl}
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
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
                  Profile photo (optional)
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
                      if (dataUrl.length > 350_000) {
                        setError('Profile photo is too large. Please choose a smaller image.');
                        return;
                      }
                      setForm((prev) => ({ ...prev, profilePhotoUrl: dataUrl }));
                    } catch (uploadError) {
                      console.error(uploadError);
                      setError('Unable to process the selected image.');
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }}
                  className="block w-full text-sm text-gray-700 dark:text-slate-200 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-800 hover:file:bg-gray-50 dark:file:border-slate-700 dark:file:bg-slate-900 dark:file:text-slate-100 dark:hover:file:bg-slate-800"
                />
                {uploadingPhoto && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Processing photo...
                  </p>
                )}
                {!uploadingPhoto && form.profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, profilePhotoUrl: '' }))}
                    className="mt-2 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
              Full name
            </label>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="e.g., Deepa Shrestha"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
              Phone number
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="+9779812345678"
              required
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
              Use international format (e.g., +977...).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
              City
            </label>
            <input
              type="text"
              autoComplete="address-level2"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              placeholder="e.g., your city in Nepal"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
            Choose your sports
          </label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600 dark:text-slate-300">
                Pick at least one.
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                {form.sports.length} selected
              </p>
            </div>
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      selected
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-600 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:border-green-500'
                    }`}
                  >
                    {sport.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 dark:text-slate-400">
            You can change this later from your profile.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-200">
            Create a strong password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="At least 8 characters with a number"
            required
          />
          <div className="mt-2 text-xs text-gray-600 space-y-1 dark:text-slate-300">
            <p className={passwordChecks.length ? 'text-green-700 dark:text-green-300' : ''}>
              At least 8 characters
            </p>
            <p className={passwordChecks.number ? 'text-green-700 dark:text-green-300' : ''}>
              Includes at least one number
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 dark:text-red-200 dark:bg-red-950/40 dark:border-red-900/40">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 dark:text-green-200 dark:bg-green-950/40 dark:border-green-900/40">
            {success}
          </p>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="accept-terms" className="text-xs leading-5">
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

        <button
          type="submit"
          disabled={loading || Boolean(validateForm())}
          className="w-full bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-400"
        >
          {loading ? 'Creating account...' : 'Start My Adventure'}
        </button>
      </form>
    </div>
  );
}
