'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, MessageCircle, X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';

const inputClass =
  'mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

export default function ServiceBookingButton({
  serviceId,
  serviceTitle,
  organizationName,
  organizationPhone,
  organizationWhatsappUrl,
  className,
}: {
  serviceId: string;
  serviceTitle: string;
  organizationName?: string | null;
  organizationPhone?: string | null;
  organizationWhatsappUrl?: string | null;
  className?: string;
}) {
  const { data: currentUser = null, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [groupSize, setGroupSize] = useState(1);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const whatsappHref = (() => {
    if (organizationWhatsappUrl?.trim()) return organizationWhatsappUrl.trim();
    const rawPhone = organizationPhone?.trim() || '';
    if (!rawPhone) return null;
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.length === 10 && digits.startsWith('9')) digits = `977${digits}`;
    if (digits.length < 10) return null;
    const text = `Namaste, I would like to ask about ${serviceTitle} on LocoXperts.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  })();

  const openBooking = () => {
    setMessage('');
    if (isLoading) {
      setMessage('Checking your account. Please try again in a second.');
      return;
    }
    if (!currentUser) {
      const next =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/services';
      window.dispatchEvent(
        new CustomEvent('open-register', {
          detail: {
            message: 'Create a free account or sign in to request this service.',
            next,
          },
        })
      );
      return;
    }
    setPhone(currentUser.phone || '');
    setOpen(true);
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`/api/organization-services/${serviceId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_date: preferredDate,
          preferred_time: preferredTime || null,
          group_size: groupSize,
          requester_phone: phone,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to request booking.');
      }
      await queryClient.invalidateQueries({ queryKey: ['participant-service-bookings'] });
      setPreferredDate('');
      setPreferredTime('');
      setGroupSize(1);
      setNotes('');
      setOpen(false);
      setMessage('Booking request sent. The organization will confirm the schedule.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to request booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openBooking}
          className={
            className ||
            'inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400'
          }
        >
          <CalendarCheck className="h-4 w-4" />
          Request service
        </button>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Contact ${organizationName || 'the organization'} on WhatsApp about ${serviceTitle}`}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
        )}
        {message && (
          <p className="basis-full text-xs text-gray-600 dark:text-slate-300" role="status">
            {message}
          </p>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-950 dark:text-white">
                  Request service
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Ask {organizationName || 'the organization'} about {serviceTitle}. They will review your preferred schedule and confirm it.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full border border-gray-200 p-2 dark:border-slate-700 dark:text-slate-300">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              Requesting as <strong>{currentUser?.name || currentUser?.email}</strong>. This sends a service request only. Confirmation and payment happen after the organization replies.
            </div>

            <form onSubmit={submitBooking} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold dark:text-slate-200">
                Preferred date
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={preferredDate}
                  onChange={(event) => setPreferredDate(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold dark:text-slate-200">
                Preferred time
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(event) => setPreferredTime(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold dark:text-slate-200">
                Group size
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={groupSize}
                  onChange={(event) => setGroupSize(Number(event.target.value || 1))}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold dark:text-slate-200">
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={inputClass}
                  placeholder="Contact number"
                />
              </label>
              <label className="sm:col-span-2 text-sm font-semibold dark:text-slate-200">
                Notes
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={inputClass}
                  placeholder="Tell the organization about your group, requirements, or questions."
                />
              </label>
              {message && (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-300">{message}</p>
              )}
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Dialog.Close type="button" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700 dark:text-slate-200">
                  Cancel
                </Dialog.Close>
                <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">
                  {submitting ? 'Sending...' : 'Send request'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
