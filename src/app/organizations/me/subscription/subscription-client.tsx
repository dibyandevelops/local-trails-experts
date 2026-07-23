'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Bike,
  Building2,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Megaphone,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import {
  ORGANIZATION_SUBSCRIPTION_MAX_MONTHS,
  ORGANIZATION_SUBSCRIPTION_PRICE_NPR,
  ORGANIZATION_SUBSCRIPTION_PROOF_MAX_BYTES,
  getOrganizationSubscriptionAmount,
} from '@/lib/organization-subscriptions';

type SubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled';
type SubscriptionPlan = 'free' | 'starter' | 'partner' | 'pro';
type PaymentStatus = 'pending' | 'approved' | 'rejected';

type ManagedOrganization = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  is_verified: boolean;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  subscription_expires_at: string | null;
  can_create_revenue_features: boolean;
  membership_role: 'org_owner' | 'org_admin' | 'org_editor';
};

type SubscriptionPayment = {
  id: string;
  amount_npr: string;
  months: number;
  transaction_reference: string | null;
  proof_image_url: string;
  status: PaymentStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  created_at: string;
};

const monthlyPriceNpr = ORGANIZATION_SUBSCRIPTION_PRICE_NPR;
const paymentQrImageUrl = process.env.NEXT_PUBLIC_ORGANIZATION_SUBSCRIPTION_QR_IMAGE_URL || '';
const paymentNote =
  process.env.NEXT_PUBLIC_ORGANIZATION_SUBSCRIPTION_PAYMENT_NOTE ||
  'Scan the QR, pay from your wallet or bank app, then upload the payment screenshot for admin review.';

async function fetchOrganizationAccess() {
  const response = await fetch('/api/organizations/me', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load organization subscription.');
  return data as { organizations: ManagedOrganization[] };
}

async function fetchPayments(organizationId: string) {
  const response = await fetch(`/api/organizations/${organizationId}/subscription-payments`, {
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load subscription payments.');
  return data as { payments: SubscriptionPayment[]; monthly_price_npr: number };
}

async function submitPayment({
  organizationId,
  months,
  transactionReference,
  proofImageUrl,
}: {
  organizationId: string;
  months: number;
  transactionReference: string;
  proofImageUrl: string;
}) {
  const response = await fetch(`/api/organizations/${organizationId}/subscription-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      months,
      amount_npr: getOrganizationSubscriptionAmount(months),
      transaction_reference: transactionReference,
      proof_image_url: proofImageUrl,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to submit payment proof.');
  return data as { payments: SubscriptionPayment[]; monthly_price_npr: number };
}

function statusLabel(status: SubscriptionStatus | PaymentStatus) {
  return status.replaceAll('_', ' ');
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatMoney(value: string | number) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

function paymentStatusClass(status: PaymentStatus) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
}

export default function OrganizationSubscriptionClient() {
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [months, setMonths] = useState(1);
  const [transactionReference, setTransactionReference] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [message, setMessage] = useState('');
  const accessQuery = useQuery({
    queryKey: ['my-organization-subscription'],
    queryFn: fetchOrganizationAccess,
    retry: false,
  });
  const organizations = useMemo(() => accessQuery.data?.organizations || [], [accessQuery.data?.organizations]);
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrgId) || organizations[0];
  const paymentsQuery = useQuery({
    queryKey: ['organization-subscription-payments', selectedOrganization?.id],
    queryFn: () => fetchPayments(selectedOrganization!.id),
    enabled: Boolean(selectedOrganization?.id),
  });
  const submitMutation = useMutation({
    mutationFn: submitPayment,
    onSuccess: async (data) => {
      if (selectedOrganization?.id) {
        queryClient.setQueryData(['organization-subscription-payments', selectedOrganization.id], data);
      }
      setTransactionReference('');
      setProofImageUrl('');
      setMonths(1);
      setMessage('Payment proof submitted. Admin approval is pending.');
      await queryClient.invalidateQueries({ queryKey: ['my-organization-subscription'] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to submit payment proof.'),
  });
  const totalAmount = getOrganizationSubscriptionAmount(months);
  const pendingPayment = paymentsQuery.data?.payments.find((payment) => payment.status === 'pending') || null;
  const canSubmitPayment = Boolean(paymentQrImageUrl && proofImageUrl && !pendingPayment);

  const handleProofUpload = async (file: File | null) => {
    if (!file) {
      setProofImageUrl('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMessage('Upload a valid payment screenshot image.');
      return;
    }
    if (file.size > ORGANIZATION_SUBSCRIPTION_PROOF_MAX_BYTES) {
      setMessage('Upload a screenshot under 2.5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofImageUrl(typeof reader.result === 'string' ? reader.result : '');
      setMessage('');
    };
    reader.readAsDataURL(file);
  };

  if (accessQuery.isLoading) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-sm text-gray-600 dark:text-slate-300">Loading subscription details...</p>
      </main>
    );
  }

  if (accessQuery.error || organizations.length === 0) {
    return (
      <main className="container mx-auto px-4 py-10">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Organization subscription</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            {accessQuery.error instanceof Error
              ? accessQuery.error.message
              : 'You are not assigned to an active organization yet.'}
          </p>
          <Link href="/organizations/me" className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            Open organization dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 px-4 py-8 text-gray-900 dark:text-slate-100">
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Organization subscription
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
              NPR 5,000 per month
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-slate-300">
              Pay by QR and submit a screenshot. Admin approval activates or extends your organization subscription.
            </p>
            <Link href="/organizations/subscription" className="mt-4 inline-flex rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              View Partner Plan details
            </Link>
          </div>
          {organizations.length > 1 && (
            <select
              value={selectedOrganization?.id || ''}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {selectedOrganization && (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-950 dark:text-white">{selectedOrganization.name}</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    {selectedOrganization.tagline || `/${selectedOrganization.slug}`}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Verification</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                    {selectedOrganization.is_verified ? 'Verified' : 'Not verified yet'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Subscription</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold capitalize">
                    <Clock3 className="h-4 w-4 text-emerald-600" />
                    {statusLabel(selectedOrganization.subscription_status)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Plan</p>
                  <p className="mt-2 text-sm font-semibold capitalize">{selectedOrganization.subscription_plan}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Expiry</p>
                  <p className="mt-2 text-sm font-semibold">{formatDate(selectedOrganization.subscription_expires_at)}</p>
                </div>
              </div>
              <div
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  selectedOrganization.can_create_revenue_features
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100'
                    : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100'
                }`}
              >
                <p className="font-semibold">
                  {selectedOrganization.can_create_revenue_features
                    ? 'Revenue features are active.'
                    : 'Revenue features are locked until approval.'}
                </p>
                <p className="mt-1">
                  Approved subscription payment unlocks marketplace listings, cycling services, and campaigns.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">What subscription unlocks</h2>
              <div className="mt-4 grid gap-3">
                {[
                  { icon: ShoppingBag, title: 'Marketplace listings', body: 'Sell cycles, parts, and accessories through your organization.' },
                  { icon: Bike, title: 'Cycling services', body: 'Publish guiding, repair, rental, shuttle, and event support services.' },
                  { icon: Megaphone, title: 'Campaigns', body: 'Create public trail-support or organization campaigns.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3 rounded-xl border border-gray-100 p-3 dark:border-slate-800">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                      <div>
                        <p className="text-sm font-semibold text-gray-950 dark:text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-slate-300">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-950 dark:text-white">Pay subscription</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {formatMoney(monthlyPriceNpr)} per month. Choose months, pay the total, then upload proof.
                </p>
              </div>
              <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                {paymentQrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={paymentQrImageUrl} alt="Subscription payment QR" className="aspect-square w-full rounded-xl bg-white object-contain p-2" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    Add NEXT_PUBLIC_ORGANIZATION_SUBSCRIPTION_QR_IMAGE_URL to show payment QR.
                  </div>
                )}
                <p className="mt-3 text-xs leading-5 text-gray-600 dark:text-slate-300">{paymentNote}</p>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedOrganization || !proofImageUrl) {
                    setMessage('Upload payment screenshot before submitting.');
                    return;
                  }
                  if (!paymentQrImageUrl) {
                    setMessage('Subscription payment QR is not configured yet.');
                    return;
                  }
                  if (pendingPayment) {
                    setMessage('A subscription payment is already pending review for this organization.');
                    return;
                  }
                  submitMutation.mutate({
                    organizationId: selectedOrganization.id,
                    months,
                    transactionReference,
                    proofImageUrl,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Months
                    <select
                      value={months}
                      onChange={(event) => setMonths(Number(event.target.value))}
                      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {Array.from({ length: ORGANIZATION_SUBSCRIPTION_MAX_MONTHS }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/35">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Total</p>
                    <p className="mt-1 text-lg font-black text-emerald-950 dark:text-emerald-100">{formatMoney(totalAmount)}</p>
                  </div>
                </div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Transaction reference
                  <input
                    value={transactionReference}
                    onChange={(event) => setTransactionReference(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Optional wallet, bank, or remarks reference"
                  />
                </label>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Payment screenshot</p>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <ImagePlus className="h-4 w-4" />
                      Upload proof
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          void handleProofUpload(event.target.files?.[0] || null);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {proofImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proofImageUrl} alt="Payment proof preview" className="mt-3 max-h-64 w-full rounded-xl object-contain" />
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                      Upload the screenshot after completing payment.
                    </p>
                  )}
                </div>
                {message && (
                  <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {message}
                  </p>
                )}
                {pendingPayment && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
                    A payment is already pending review. Submit another payment after admin reviews it.
                  </p>
                )}
                {!paymentQrImageUrl && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-100">
                    Payment QR is missing. Configure the subscription QR before accepting organization payments.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitMutation.isPending || !canSubmitPayment}
                  className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950"
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit payment for review'}
                </button>
              </form>
            </div>
          </section>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Payment status</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              Track submitted subscription payments and admin review status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => paymentsQuery.refetch()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            Refresh
          </button>
        </div>
        {paymentsQuery.isLoading ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">Loading payments...</p>
        ) : paymentsQuery.data?.payments.length ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Months</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Admin note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {paymentsQuery.data.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{formatDate(payment.created_at)}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(payment.amount_npr)}</td>
                    <td className="px-4 py-3">{payment.months}</td>
                    <td className="px-4 py-3">{payment.transaction_reference || 'Not provided'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${paymentStatusClass(payment.status)}`}>
                        {statusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{payment.admin_note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
            No subscription payment submitted yet.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/organizations/me" className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
          Back to dashboard
        </Link>
        <Link href="/organizations" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          View public organizations
        </Link>
      </div>
    </main>
  );
}
