'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type OrganizationPromotion = {
  id: string;
  title: string;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

type PromotionForm = {
  title: string;
  description: string;
  cta_label: string;
  cta_url: string;
  image_url: string;
  starts_at: string;
  ends_at: string;
};

const emptyForm: PromotionForm = {
  title: '',
  description: '',
  cta_label: 'Learn more',
  cta_url: '',
  image_url: '',
  starts_at: new Date().toISOString().slice(0, 10),
  ends_at: '',
};

async function promotionRequest(organizationId: string, init?: RequestInit): Promise<{ promotions: OrganizationPromotion[] }> {
  const response = await fetch(`/api/organizations/${organizationId}/promotions`, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Promotion request failed.');
  return data;
}

function formatDate(value: string | null) {
  if (!value) return 'No end date';
  return new Intl.DateTimeFormat('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function OrganizationPromotionsManagementPanel({
  organizationId,
  canCreateRevenueFeatures = false,
}: {
  organizationId: string;
  canCreateRevenueFeatures?: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = ['organization-promotions-management', organizationId] as const;
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const query = useQuery({
    queryKey,
    queryFn: () => promotionRequest(organizationId),
    enabled: Boolean(organizationId),
  });
  const create = useMutation({
    mutationFn: (values: PromotionForm) =>
      promotionRequest(organizationId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          cta_label: values.cta_label || null,
          cta_url: values.cta_url || null,
          image_url: values.image_url || null,
          starts_at: values.starts_at,
          ends_at: values.ends_at || null,
        }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setForm(emptyForm);
    },
  });
  const toggle = useMutation({
    mutationFn: (promotion: OrganizationPromotion) =>
      promotionRequest(organizationId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotion_id: promotion.id, is_active: !promotion.is_active }),
      }),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const promotions = query.data?.promotions || [];
  const isFormDisabled = !canCreateRevenueFeatures || create.isPending;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly promotion slot</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Promote one service, event, marketplace item, or campaign each month from your organization profile.
          </p>
        </div>
        <Megaphone className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
      </div>

      {!canCreateRevenueFeatures && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
          Monthly promotions are available after the organization is verified and subscribed.{' '}
          <Link href="/organizations/subscription" className="font-bold underline underline-offset-2">
            View the Partner Plan
          </Link>
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreateRevenueFeatures || !form.title.trim()) return;
          create.mutate(form);
        }}
        className="mt-5 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/40 md:grid-cols-2"
      >
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Promotion title
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Weekend shuttle discount, new repair package, trail campaign..."
          />
        </label>
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Description
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Keep it short and concrete."
          />
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          CTA label
          <input
            value={form.cta_label}
            onChange={(event) => setForm((current) => ({ ...current, cta_label: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          CTA URL
          <input
            type="url"
            value={form.cta_url}
            onChange={(event) => setForm((current) => ({ ...current, cta_url: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="https://..."
          />
        </label>
        <label className="md:col-span-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Image URL
          <input
            value={form.image_url}
            onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Optional image URL"
          />
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Starts
          <input
            type="date"
            value={form.starts_at}
            onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Ends
          <input
            type="date"
            value={form.ends_at}
            onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
            disabled={isFormDisabled}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        {create.error && <p className="md:col-span-2 text-sm text-red-600 dark:text-red-300">{create.error.message}</p>}
        {toggle.error && <p className="md:col-span-2 text-sm text-red-600 dark:text-red-300">{toggle.error.message}</p>}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={!canCreateRevenueFeatures || !form.title.trim() || create.isPending}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950"
          >
            {create.isPending ? 'Publishing...' : 'Publish promotion'}
          </button>
        </div>
      </form>

      {query.isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-slate-400">Loading promotions...</p>
      ) : promotions.length === 0 ? (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
          No monthly promotions yet.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Promotion</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{promotion.title}</p>
                    {promotion.description && <p className="line-clamp-1 text-xs text-gray-500 dark:text-slate-400">{promotion.description}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                    {formatDate(promotion.starts_at)} - {formatDate(promotion.ends_at)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">
                      {promotion.is_active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(promotion)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700">
                      {promotion.is_active ? 'Pause' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
