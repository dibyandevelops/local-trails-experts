'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import MarketplaceListingFormDialog from '@/components/feature-components/marketplace/marketplace-listing-form-dialog';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  fetchAdminMarketplaceData,
  moderateMarketplaceListing,
  reviewMarketplaceReport,
  updateMarketplaceListing,
} from '@/services/marketplace/marketplace.service';
import type {
  MarketplaceListing,
  MarketplaceListingInput,
  MarketplaceListingStatus,
  MarketplaceReportStatus,
} from '@/lib/marketplace';

const reasonLabel: Record<string, string> = {
  suspected_scam: 'Suspected scam',
  prohibited_item: 'Prohibited or unsafe item',
  incorrect_details: 'Incorrect details',
  already_sold: 'Already sold',
  other: 'Other',
};

export default function MarketplaceModerationPanel() {
  const queryClient = useQueryClient();
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.marketplace.admin,
    queryFn: ({ signal }) => fetchAdminMarketplaceData(signal),
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.marketplace.admin }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.marketplace.page }),
  ]);
  const listingMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MarketplaceListingStatus }) =>
      moderateMarketplaceListing(id, status),
    onSuccess: refresh,
  });
  const reportMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MarketplaceReportStatus }) =>
      reviewMarketplaceReport(id, status),
    onSuccess: refresh,
  });
  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarketplaceListingInput }) =>
      updateMarketplaceListing(id, input),
    onSuccess: async () => {
      setEditingListing(null);
      await refresh();
    },
  });

  const openReports = data?.reports.filter((report) => report.status === 'open') || [];
  const listings = data?.listings || [];
  const mutationError = listingMutation.error || reportMutation.error || editMutation.error;
  const isMutating = listingMutation.isPending || reportMutation.isPending || editMutation.isPending;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Marketplace moderation</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Review rider reports and control listing visibility.</p>
        </div>
        <Link href="/marketplace" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">Public marketplace</Link>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">Loading marketplace moderation...</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error instanceof Error ? error.message : 'Could not load marketplace moderation.'}</p> : null}
      {mutationError ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{mutationError instanceof Error ? mutationError.message : 'Could not update marketplace moderation.'}</p> : null}

      {!isLoading && !error ? (
        <div className="mt-5 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-gray-700 dark:text-slate-300">Open reports ({openReports.length})</h3>
            <div className="mt-3 grid gap-3">
              {openReports.length === 0 ? <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-slate-900 dark:text-slate-300">No open reports.</p> : openReports.map((report) => (
                <article key={report.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-gray-950 dark:text-white">{report.listingTitle}</p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{reasonLabel[report.reason]} · Reported by {report.reporterName} ({report.reporterEmail})</p>
                      {report.details ? <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">{report.details}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" disabled={isMutating} onClick={() => reportMutation.mutate({ id: report.id, status: 'reviewed' })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60">Reviewed</button>
                      <button type="button" disabled={isMutating} onClick={() => reportMutation.mutate({ id: report.id, status: 'dismissed' })} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Dismiss</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-gray-700 dark:text-slate-300">Listings ({listings.length})</h3>
            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-slate-800">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-3 py-3">Listing</th><th className="px-3 py-3">Seller</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Reports</th><th className="px-3 py-3">Controls</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-3 py-3"><p className="font-semibold text-gray-950 dark:text-white">{listing.title}</p><p className="text-xs text-gray-500">{listing.category} · {listing.location}</p></td>
                      <td className="px-3 py-3 text-gray-700 dark:text-slate-200">{listing.seller.name}</td>
                      <td className="px-3 py-3 capitalize text-gray-700 dark:text-slate-200">{listing.status}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-slate-200">{listing.openReportCount || 0} open</td>
                      <td className="px-3 py-3"><div className="flex flex-wrap gap-2">
                        <button type="button" disabled={isMutating} onClick={() => setEditingListing(listing)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 dark:border-slate-700">Edit</button>
                        {listing.status === 'hidden' ? <button type="button" disabled={isMutating} onClick={() => listingMutation.mutate({ id: listing.id, status: 'active' })} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 dark:border-slate-700">Restore</button> : <button type="button" disabled={isMutating} onClick={() => listingMutation.mutate({ id: listing.id, status: 'hidden' })} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 dark:border-slate-700">Hide</button>}
                        {listing.status !== 'sold' ? <button type="button" disabled={isMutating} onClick={() => listingMutation.mutate({ id: listing.id, status: 'sold' })} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 dark:border-slate-700">Sold</button> : null}
                        <button type="button" disabled={isMutating} onClick={() => window.confirm(`Remove "${listing.title}"?`) && listingMutation.mutate({ id: listing.id, status: 'deleted' })} className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300">Delete</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      <MarketplaceListingFormDialog
        open={Boolean(editingListing)}
        onOpenChange={(open) => {
          if (!open) setEditingListing(null);
        }}
        listing={editingListing}
        onSubmit={async (input) => {
          if (!editingListing) return;
          await editMutation.mutateAsync({ id: editingListing.id, input });
        }}
      />
    </section>
  );
}
