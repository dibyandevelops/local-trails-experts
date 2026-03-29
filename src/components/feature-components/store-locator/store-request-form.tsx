'use client';

import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/services/api/client';
import StoreLocationPicker from '@/components/feature-components/store-locator/store-location-picker';

type InitialStore = {
  storeName: string;
  city: string;
  location: string;
  locationLat: string;
  locationLng: string;
  phone: string;
  services: string;
  website: string;
};

type SubmitPayload = {
  store_name: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  contact_name: null;
  contact_email: null;
  phone: string;
  services: string;
  website: string;
};

type Props = {
  initialStore?: InitialStore | null;
  onSubmitOverride?: (payload: SubmitPayload) => void;
};

export default function StoreRequestForm({ initialStore = null, onSubmitOverride }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const [acceptTerms, setAcceptTerms] = useState(false);
  const isAdminEdit = Boolean(onSubmitOverride);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    storeName: initialStore?.storeName || '',
    city: initialStore?.city || '',
    location: initialStore?.location || '',
    locationLat: initialStore?.locationLat || '',
    locationLng: initialStore?.locationLng || '',
    phone: initialStore?.phone || '',
    services: initialStore?.services || '',
    website: initialStore?.website || '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!acceptTerms && !isAdminEdit) {
      setStatus('error');
      setMessage('Please accept the terms and privacy policy.');
      return;
    }
    if (!form.locationLat || !form.locationLng) {
      setStatus('error');
      setMessage('Please pick the store location on the map.');
      return;
    }
    if (form.phone && !/^\+?[0-9\s-]{7,15}$/.test(form.phone)) {
      setStatus('error');
      setMessage('Please enter a valid phone number.');
      return;
    }
    if (form.website && !/^https?:\/\/[\w.-]+/i.test(form.website)) {
      setStatus('error');
      setMessage('Please enter a valid website URL (https://...).');
      return;
    }
    setStatus('sending');
    setMessage(null);
    try {
      const payload = {
        store_name: form.storeName.trim(),
        city: form.city.trim() || 'Nepal',
        location: form.location.trim() || 'Selected on map',
        latitude: Number(form.locationLat),
        longitude: Number(form.locationLng),
        contact_name: null,
        contact_email: null,
        phone: form.phone.trim(),
        services: form.services.trim(),
        website: form.website.trim(),
      };

      if (onSubmitOverride) {
        onSubmitOverride(payload);
      } else {
        await apiClient.post('/api/store-requests', payload);
      }
      setStatus('sent');
      setMessage(isAdminEdit ? 'Store updated.' : 'Request sent. We will review and get back to you.');
      setForm({
        storeName: '',
        city: '',
        location: '',
        locationLat: '',
        locationLng: '',
        phone: '',
        services: '',
        website: '',
      });
      setAcceptTerms(false);
    } catch (error) {
      setStatus('error');
      setMessage('Unable to send request. Please try again.');
    }
  };

  useEffect(() => {
    if (!form.locationLat || !form.locationLng) return;
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      try {
        const { data } = await apiClient.get<{ result: any }>(
          `/api/geo/nominatim/reverse?lat=${encodeURIComponent(form.locationLat)}&lon=${encodeURIComponent(form.locationLng)}`
        );
        const address = data?.result?.address || {};
        const city =
          address.city ||
          address.town ||
          address.village ||
          address.state ||
          '';
        const label =
          data?.result?.display_name ||
          [address.road, address.suburb, city].filter(Boolean).join(', ');

        setForm((prev) => ({
          ...prev,
          city: city || prev.city,
          location: label || prev.location,
        }));
      } catch {
        // ignore reverse lookup errors
      }
    }, 400);
  }, [form.locationLat, form.locationLng]);

  useEffect(() => {
    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
  }, []);


  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Request to list your store
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Share your details and we’ll review your listing for Nepal Cycle Hubs.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
            status === 'sent'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Store name
          </label>
          <input
            required
            value={form.storeName}
            onChange={(event) => setForm((prev) => ({ ...prev, storeName: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Detected location
          </label>
          <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            {form.location || 'Pick a point on the map to fill this.'}
          </div>
          {form.city && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              City: {form.city}
            </p>
          )}
        </div>

        <div>
          <StoreLocationPicker
            lat={form.locationLat}
            lng={form.locationLng}
            onChange={(next) =>
              setForm((prev) => ({
                ...prev,
                locationLat: next.lat,
                locationLng: next.lng,
              }))
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Phone
          </label>
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="+977-1-XXXXXXX"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Services offered
          </label>
          <textarea
            value={form.services}
            onChange={(event) => setForm((prev) => ({ ...prev, services: event.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Tell us about rentals, repairs, gear, or guiding support."
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Website / social link
          </label>
          <input
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-3">
          {!isAdminEdit && (
            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                I agree to the{' '}
                <a href="/terms" className="font-semibold text-emerald-700 hover:underline">
                  Terms &amp; Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" className="font-semibold text-emerald-700 hover:underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          )}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'sending'
              ? 'Saving...'
              : isAdminEdit
              ? 'Save store'
              : 'Send store request'}
          </button>
          {!isAdminEdit && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              We respond within 2–3 working days. For urgent updates email {contactEmail}.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
