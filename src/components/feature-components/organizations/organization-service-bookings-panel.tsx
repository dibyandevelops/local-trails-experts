'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateText from '@/components/ui/date-text';

type ServiceBooking = {
  id: string;
  service_title: string;
  requester_name: string | null;
  requester_email: string;
  requester_phone: string | null;
  preferred_date: string;
  preferred_time: string | null;
  group_size: number;
  quoted_price_npr: string | null;
  notes: string | null;
  organization_response_note: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  created_at: string;
};

async function bookingRequest(organizationId: string, init?: RequestInit) {
  const response = await fetch(`/api/organizations/${organizationId}/service-bookings`, {
    cache: 'no-store',
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Service booking request failed.');
  return data as { bookings: ServiceBooking[] };
}

export default function OrganizationServiceBookingsPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['organization-service-bookings', organizationId] as const;
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey,
    queryFn: () => bookingRequest(organizationId),
    enabled: Boolean(organizationId),
  });
  const update = useMutation({
    mutationFn: ({ booking, status }: { booking: ServiceBooking; status: string }) =>
      bookingRequest(organizationId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          status,
          organization_response_note:
            responseNotes[booking.id] ?? booking.organization_response_note ?? '',
        }),
      }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const bookings = query.data?.bookings || [];
  const activeCount = bookings.filter((booking) => ['pending', 'accepted'].includes(booking.status)).length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service booking requests
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Confirm preferred schedules with participants before delivering the service.
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          {activeCount} active
        </span>
      </div>

      {query.isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-slate-400">Loading booking requests...</p>
      ) : query.error ? (
        <p className="mt-5 text-sm text-red-600 dark:text-red-300">{query.error.message}</p>
      ) : bookings.length === 0 ? (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
          No participant service booking requests yet.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {bookings.map((booking) => {
            const isPending = booking.status === 'pending';
            const isAccepted = booking.status === 'accepted';
            return (
              <article key={booking.id} className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-950 dark:text-white">{booking.service_title}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {booking.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-slate-200">
                      {booking.requester_name || booking.requester_email} · {booking.group_size} participant{booking.group_size === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {booking.preferred_date}{booking.preferred_time ? ` at ${booking.preferred_time}` : ''} · Requested <DateText value={booking.created_at} pattern="PPP" />
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {booking.requester_email}{booking.requester_phone ? ` · ${booking.requester_phone}` : ''}
                    </p>
                    {booking.notes && <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-slate-900 dark:text-slate-200">{booking.notes}</p>}
                  </div>
                  {booking.quoted_price_npr && (
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      NPR {Number(booking.quoted_price_npr).toLocaleString()}
                    </p>
                  )}
                </div>

                {(isPending || isAccepted) && (
                  <div className="mt-4">
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={responseNotes[booking.id] ?? booking.organization_response_note ?? ''}
                      onChange={(event) =>
                        setResponseNotes((current) => ({ ...current, [booking.id]: event.target.value }))
                      }
                      placeholder="Confirmation details, meeting point, or reason for declining"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {isPending && (
                        <>
                          <button type="button" disabled={update.isPending} onClick={() => update.mutate({ booking, status: 'declined' })} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300">
                            Decline
                          </button>
                          <button type="button" disabled={update.isPending} onClick={() => update.mutate({ booking, status: 'accepted' })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">
                            Accept request
                          </button>
                        </>
                      )}
                      {isAccepted && (
                        <button type="button" disabled={update.isPending} onClick={() => update.mutate({ booking, status: 'completed' })} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-950">
                          Mark completed
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {update.error && <p className="mt-3 text-sm text-red-600 dark:text-red-300">{update.error.message}</p>}
    </section>
  );
}
