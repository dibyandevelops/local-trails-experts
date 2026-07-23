'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type PaymentStatus = 'pending' | 'approved' | 'rejected';

type SubscriptionPayment = {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  amount_npr: string;
  months: number;
  transaction_reference: string | null;
  proof_image_url: string;
  status: PaymentStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  created_at: string;
};

async function fetchSubscriptionPayments() {
  const response = await fetch('/api/admin/organization-subscription-payments', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load subscription payments.');
  return data as { payments: SubscriptionPayment[] };
}

async function reviewSubscriptionPayment(input: { id: string; status: 'approved' | 'rejected'; admin_note: string }) {
  const response = await fetch('/api/admin/organization-subscription-payments', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to review subscription payment.');
  return data as { payments: SubscriptionPayment[] };
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatMoney(value: string | number) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

function statusClass(status: PaymentStatus) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
}

export default function OrganizationSubscriptionPaymentsPanel() {
  const queryClient = useQueryClient();
  const [adminNoteById, setAdminNoteById] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-organization-subscription-payments'],
    queryFn: fetchSubscriptionPayments,
  });
  const review = useMutation({
    mutationFn: reviewSubscriptionPayment,
    onSuccess: async (nextData) => {
      queryClient.setQueryData(['admin-organization-subscription-payments'], nextData);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-organizations'] }),
        queryClient.invalidateQueries({ queryKey: ['my-organization-subscription'] }),
      ]);
    },
  });
  const payments = data?.payments || [];
  const pendingCount = payments.filter((payment) => payment.status === 'pending').length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Organization subscription payments</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Review NPR 5,000/month subscription payment proofs and activate organizations after approval.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {pendingCount} pending
        </span>
      </div>

      {isLoading ? <p className="text-sm text-gray-600 dark:text-slate-300">Loading subscription payments...</p> : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error instanceof Error ? error.message : 'Failed to load subscription payments.'}
        </p>
      ) : null}
      {review.error ? (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {review.error instanceof Error ? review.error.message : 'Failed to review subscription payment.'}
        </p>
      ) : null}

      {!isLoading && payments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No subscription payment proofs submitted yet.
        </p>
      ) : null}

      {payments.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Admin note</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {payments.map((payment) => (
                <tr key={payment.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-950 dark:text-white">{payment.organization_name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">/{payment.organization_slug}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {payment.submitted_by_name || payment.submitted_by_email || 'Unknown submitter'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{formatDate(payment.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{formatMoney(payment.amount_npr)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{payment.months} month{payment.months === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{payment.transaction_reference || 'No reference'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href={payment.proof_image_url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-300">
                      View proof
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClass(payment.status)}`}>
                      {payment.status}
                    </span>
                    {payment.reviewed_at && <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{formatDate(payment.reviewed_at)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {payment.status === 'pending' ? (
                      <textarea
                        rows={2}
                        value={adminNoteById[payment.id] || ''}
                        onChange={(event) => setAdminNoteById((current) => ({ ...current, [payment.id]: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Optional note"
                      />
                    ) : (
                      <p className="max-w-xs text-xs text-gray-600 dark:text-slate-300">{payment.admin_note || '-'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {payment.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: payment.id, status: 'approved', admin_note: adminNoteById[payment.id] || '' })}
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: payment.id, status: 'rejected', admin_note: adminNoteById[payment.id] || '' })}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-slate-400">{payment.reviewed_by_name || 'Reviewed'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
