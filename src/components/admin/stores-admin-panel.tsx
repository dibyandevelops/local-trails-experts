'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type { Store } from '@/types';
import StoreRequestForm from '@/components/feature-components/store-locator/store-request-form';

type EditState = {
  open: boolean;
  store: Store | null;
};

export default function StoresAdminPanel() {
  const queryClient = useQueryClient();
  const [editState, setEditState] = useState<EditState>({ open: false, store: null });
  const [message, setMessage] = useState<string | null>(null);

  const { data: stores = [], isLoading } = useQuery<Store[]>({
    queryKey: QUERY_KEYS.stores.all(),
    queryFn: async () => {
      const { data } = await apiClient.get<{ stores: Store[] }>(
        '/api/stores?includeInactive=true'
      );
      return data.stores || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Store) => {
      const { data } = await apiClient.patch<{ store: Store }>(
        `/api/stores/${payload.id}`,
        payload
      );
      return data.store;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stores.all() });
      setMessage('Store updated.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update store.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/stores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stores.all() });
      setMessage('Store removed.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to delete store.');
    },
  });

  const groupedStores = useMemo(() => {
    const grouped = stores.reduce<Record<string, Store[]>>((acc, store) => {
      const key = store.city || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(store);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [stores]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Stores (admin)
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Manage store listings and remove outdated entries.
          </p>
        </div>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800">
              Add store
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add store
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    This will auto-approve and show in the locator.
                  </p>
                </div>
                <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                  Close
                </Dialog.Close>
              </div>
              <div className="mt-5">
                <StoreRequestForm />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      )}

      <div className="mt-5 space-y-6">
        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            Loading stores…
          </div>
        ) : groupedStores.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            No stores yet.
          </div>
        ) : (
          groupedStores.map(([city, cityStores]) => (
            <div key={city} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {city}
                </p>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {cityStores.length} store{cityStores.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-3">
                {cityStores.map((store) => (
                  <div
                    key={store.id}
                    className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {store.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {store.location}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditState({ open: true, store })}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(store.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {store.is_active === false && (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                        Inactive
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {editState.store && (
        <Dialog.Root
          open={editState.open}
          onOpenChange={(open) =>
            setEditState((prev) => ({ ...prev, open, store: open ? prev.store : null }))
          }
        >
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Edit store
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    Update the store details and save.
                  </p>
                </div>
                <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                  Close
                </Dialog.Close>
              </div>
              <div className="mt-5">
                <StoreRequestForm
                  initialStore={{
                    storeName: editState.store.name,
                    city: editState.store.city,
                    location: editState.store.location,
                    locationLat: String(editState.store.latitude),
                    locationLng: String(editState.store.longitude),
                    phone: editState.store.phone || '',
                    services: editState.store.services || '',
                    website: editState.store.website || '',
                  }}
                  onSubmitOverride={(payload) => {
                    updateMutation.mutate({
                      ...editState.store!,
                      name: payload.store_name,
                      city: payload.city,
                      location: payload.location,
                      latitude: payload.latitude,
                      longitude: payload.longitude,
                      phone: payload.phone || null,
                      services: payload.services || null,
                      website: payload.website || null,
                      hours: editState.store?.hours || null,
                    } as Store);
                  }}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </section>
  );
}
