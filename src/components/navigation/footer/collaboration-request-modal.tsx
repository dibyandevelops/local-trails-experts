'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { User } from '@/types';

const COLLAB_TYPES = [
  { value: 'coding', label: 'Coding & engineering' },
  { value: 'design', label: 'Product/UI design' },
  { value: 'qa_devops', label: 'QA, testing & DevOps' },
  { value: 'digital_marketing', label: 'Digital marketing' },
  { value: 'partnerships', label: 'Partnerships & sponsors' },
  { value: 'content', label: 'Content & storytelling' },
  { value: 'community', label: 'Community operations' },
  { value: 'trail_support', label: 'Trail support & logistics' },
  { value: 'other', label: 'Other useful contribution' },
] as const;

export default function CollaborationRequestModal({
  open,
  onOpenChange,
  initialUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser?: User | null;
}) {
  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [type, setType] = useState<(typeof COLLAB_TYPES)[number]['value']>('digital_marketing');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const subject = useMemo(() => {
    const label = COLLAB_TYPES.find((item) => item.value === type)?.label || 'Collaboration';
    return `Collaboration interest: ${label}`;
  }, [type]);

  const reset = () => {
    setName(initialUser?.name || '');
    setEmail(initialUser?.email || '');
    setType('digital_marketing');
    setMessage('');
    setStatus('');
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedEmail) {
      setStatus('Please enter your name and email.');
      return;
    }
    if (trimmedMessage.length < 20) {
      setStatus('Please add a short message with at least 20 characters.');
      return;
    }

    setSubmitting(true);
    setStatus('');
    try {
      const response = await fetch('/api/contact/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          company: '',
          sponsorTier: 'custom',
          subject,
          message: trimmedMessage,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send collaboration request');
      }

      setStatus('Thanks! Your collaboration request has been sent.');
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 900);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to send collaboration request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Collaborate with LocoXperts
          </Dialog.Title>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            If you can help with coding, design, QA/DevOps, marketing, partnerships, content, or operations, send us a quick note.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Collaboration type
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {COLLAB_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Tell us how you can contribute and how we can work together."
            />
          </div>

          {status && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {status}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {submitting ? 'Sending...' : 'Send collaboration request'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
