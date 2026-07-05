'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';

type StoreRequest = {
  id: string;
  store_name: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  services: string | null;
  website: string | null;
  created_at: string;
};

export default function StoreRequestsPanel() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery<StoreRequest[]>({
    queryKey: ['admin-store-requests'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ requests: StoreRequest[] }>(
        '/api/admin/store-requests'
      );
      return data.requests || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const { data } = await apiClient.patch('/api/admin/store-requests', { id, action });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-store-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Store requests
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Review and approve stores to show in the locator.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            Loading store requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            No store requests right now.
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {req.store_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {req.location} · {req.city}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => mutation.mutate({ id: req.id, action: 'approve' })}
                    className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => mutation.mutate({ id: req.id, action: 'reject' })}
                    className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-slate-300">
                {req.services && <div>Services: {req.services}</div>}
                {req.contact_name && <div>Contact: {req.contact_name}</div>}
                {req.contact_email && <div>Email: {req.contact_email}</div>}
                {req.phone && <div>Phone: {req.phone}</div>}
                {req.website && <div>Website: {req.website}</div>}
                <div>
                  Coordinates: {req.latitude.toFixed(5)}, {req.longitude.toFixed(5)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
