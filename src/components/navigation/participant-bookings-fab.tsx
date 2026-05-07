'use client';

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import DateText from '@/components/ui/date-text';

type MyBooking = {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  city: string | null;
  total_price_npr: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | null;
};

export default function ParticipantBookingsFab() {
  const { data: user = null } = useCurrentUser();
  const isParticipant = user?.role === 'participant';
  const [nowMs, setNowMs] = useState<number | null>(null);

  const { data: bookings = [] } = useQuery<MyBooking[]>({
    queryKey: ['participant-bookings-fab'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/bookings/me', { signal, cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      return data.bookings || [];
    },
    enabled: isParticipant,
    refetchInterval: 30000,
  });

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const bookedEventsCount = useMemo(() => {
    if (nowMs === null) return 0;
    return bookings.filter((item) => {
      if (item.status === 'cancelled') return false;
      const eventTime = new Date(item.event_date).getTime();
      if (!Number.isFinite(eventTime)) return false;
      return eventTime >= nowMs;
    }).length;
  }, [bookings, nowMs]);

  if (!isParticipant) return null;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 shadow-lg hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
        >
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
            {bookedEventsCount}
          </span>
          Your bookings
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 h-[88vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Your bookings
            </Dialog.Title>
            <Dialog.Close className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              Close
            </Dialog.Close>
          </div>

          {bookings.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-slate-300">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((item) => {
                const isPaid = item.payment_status === 'paid';
                const isPendingPayment =
                  item.status !== 'cancelled' &&
                  Number(item.total_price_npr || 0) > 0 &&
                  item.payment_status !== 'paid' &&
                  item.payment_status !== 'refunded';

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/40"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {item.event_title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          <DateText value={item.event_date} pattern="PPP p" />
                          {item.city ? ` • ${item.city}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
                              : isPendingPayment
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {isPaid
                            ? 'Payment Confirmed'
                            : isPendingPayment
                              ? 'Payment Pending'
                              : 'Status Updated'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          NPR {item.total_price_npr}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/events/${item.event_id}`}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                      >
                        View event
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
