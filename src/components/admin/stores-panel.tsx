'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type { Store } from '@/types';
import AppDialog from '@/components/ui/app-dialog';

const CITY_OPTIONS = ['Kathmandu', 'Pokhara'];

export default function StoresPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: 'Kathmandu',
    location: '',
    latitude: '',
    longitude: '',
    services: '',
    hours: '',
    phone: '',
    website: '',
  });

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: QUERY_KEYS.stores.all(),
    queryFn: async () => {
      const { data } = await apiClient.get<{ stores: Store[] }>('/api/stores');
      return data.stores || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        city: form.city,
        location: form.location.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        services: form.services.trim() || null,
        hours: form.hours.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
      };
      const { data } = await apiClient.post<{ store: Store }>('/api/stores', payload);
      return data.store;
    },
    onSuccess: () => {
      setMessage('Store added.');
      setForm({
        name: '',
        city: 'Kathmandu',
        location: '',
        latitude: '',
        longitude: '',
        services: '',
        hours: '',
        phone: '',
        website: '',
      });
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stores.all() });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to add store.');
    },
  });

  const storeForm = (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          createMutation.mutate();
        }}
        className="mt-5 grid gap-3 md:grid-cols-2"
      >
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Store name
          </label>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            City
          </label>
          <select
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {CITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Location description
          </label>
          <input
            required
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Latitude
          </label>
          <input
            required
            type="number"
            step="any"
            value={form.latitude}
            onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Longitude
          </label>
          <input
            required
            type="number"
            step="any"
            value={form.longitude}
            onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Services
          </label>
          <input
            value={form.services}
            onChange={(event) => setForm((prev) => ({ ...prev, services: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Hours
          </label>
          <input
            value={form.hours}
            onChange={(event) => setForm((prev) => ({ ...prev, hours: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            Website
          </label>
          <input
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? 'Adding...' : 'Add store'}
          </button>
        </div>
      </form>
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cycle Hubs
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Add and maintain partner stores for the locator map.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-800"
        >
          Add store
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Active stores
        </h3>
        <div className="mt-3 grid gap-3">
          {isLoading ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              Loading stores…
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              No stores added yet.
            </div>
          ) : (
            stores.map((store) => (
              <div
                key={store.id}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{store.name}</span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {store.city}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {store.location}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
      <AppDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Add store"
        description="Add a partner store to the locator map."
        maxWidthClassName="max-w-2xl"
      >
        {storeForm}
      </AppDialog>
    </section>
  );
}
