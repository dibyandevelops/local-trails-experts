'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import DateText from '@/components/ui/date-text';
import { useCurrentUser } from '@/hooks/use-current-user';

type AccountDeletionRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function AccountDeletionRequestCta() {
  const { data: user = null } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadRequest = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/me/delete-request');
        const data = await res.json().catch(() => ({}));
        setRequest(data?.request || null);
      } catch {
        // ignore
      }
    };
    loadRequest();
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
        <p>To request account deletion, please sign in first.</p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('open-login', {
                detail: {
                  message: 'Sign in to manage data and account deletion requests.',
                  next: '/privacy',
                },
              })
            )
          }
          className="mt-3 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-900/50 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
            Request account deletion
          </h3>
          <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
            Deletion is manual and reviewed by admin for safety, billing, and record integrity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          Open deletion form
        </button>
      </div>

      {request?.status === 'pending' && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Pending request created on <DateText value={request.created_at} pattern="PPP p" />.
        </p>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-white">
                Account deletion request
              </Dialog.Title>
              <Dialog.Close className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Close
              </Dialog.Close>
            </div>
            <div className="space-y-3">
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional reason for deletion request"
                className="min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <label className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(event) => setConfirm(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-700 focus:ring-red-500"
                />
                <span>I understand this action is permanent once approved and completed.</span>
              </label>
              {message && <p className="text-xs text-gray-700 dark:text-slate-200">{message}</p>}
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setMessage(null);
                  if (!confirm) {
                    setMessage('Please confirm acknowledgement first.');
                    return;
                  }
                  setSubmitting(true);
                  try {
                    const res = await fetch('/api/me/delete-request', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ reason: reason.trim() || null }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      throw new Error(data?.error || 'Failed to submit request.');
                    }
                    setRequest(data.request as AccountDeletionRequest);
                    setMessage('Deletion request submitted. You will receive email updates.');
                    setReason('');
                    setConfirm(false);
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Failed to submit request.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit deletion request'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
