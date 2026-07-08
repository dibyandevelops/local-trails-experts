'use client';

import Image from 'next/image';
import { Eye, EyeOff, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { formatMarketplacePrice, type MarketplaceListing, type MarketplaceListingStatus } from '@/lib/marketplace';

export default function MarketplaceOwnerPanel({
  listings,
  listingLimit,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  listings: MarketplaceListing[];
  listingLimit: number;
  onEdit: (listing: MarketplaceListing) => void;
  onStatusChange: (listing: MarketplaceListing, status: MarketplaceListingStatus) => void;
  onDelete: (listing: MarketplaceListing) => void;
}) {
  const liveCount = listings.filter((listing) => listing.status === 'active' || listing.status === 'hidden').length;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-950 dark:text-white">Your listings</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{liveCount} of {listingLimit} live listing slots used.</p>
        </div>
      </div>
      {listings.length === 0 ? (
        <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-slate-950 dark:text-slate-300">You have not listed an item yet.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {listings.map((listing) => (
            <article key={listing.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center">
              <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800 sm:w-24">
                {listing.images[0] ? <Image src={listing.images[0]} alt="" fill className="object-cover" sizes="96px" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-950 dark:text-white">{listing.title}</h3>
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-bold capitalize text-gray-600 dark:border-slate-700 dark:text-slate-300">{listing.status}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{formatMarketplacePrice(listing.priceNpr)} · {listing.location}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onEdit(listing)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label={`Edit ${listing.title}`} title="Edit listing"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                {listing.status === 'active' ? (
                  <button type="button" onClick={() => onStatusChange(listing, 'hidden')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label={`Hide ${listing.title}`} title="Hide listing"><EyeOff className="h-4 w-4" aria-hidden="true" /></button>
                ) : listing.status === 'hidden' ? (
                  <button type="button" onClick={() => onStatusChange(listing, 'active')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label={`Show ${listing.title}`} title="Show listing"><Eye className="h-4 w-4" aria-hidden="true" /></button>
                ) : (
                  <button type="button" onClick={() => onStatusChange(listing, 'active')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label={`Relist ${listing.title}`} title="Relist item"><RotateCcw className="h-4 w-4" aria-hidden="true" /></button>
                )}
                {listing.status !== 'sold' ? <button type="button" onClick={() => onStatusChange(listing, 'sold')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">Mark sold</button> : null}
                <button type="button" onClick={() => onDelete(listing)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40" aria-label={`Delete ${listing.title}`} title="Delete listing"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
