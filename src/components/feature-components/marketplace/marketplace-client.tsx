'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Bike, PackageSearch, Plus, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import MarketplaceListingCard from '@/components/feature-components/marketplace/marketplace-listing-card';
import MarketplaceListingFormDialog from '@/components/feature-components/marketplace/marketplace-listing-form-dialog';
import MarketplaceOwnerPanel from '@/components/feature-components/marketplace/marketplace-owner-panel';
import MarketplaceReportDialog from '@/components/feature-components/marketplace/marketplace-report-dialog';
import { useMarketplace } from '@/hooks/marketplace/use-marketplace';
import {
  marketplaceCategories,
  marketplaceListingTypes,
  type MarketplaceListing,
  type MarketplaceListingInput,
  type MarketplaceListingStatus,
  type MarketplacePageData,
  type MarketplaceReportReason,
} from '@/lib/marketplace';

type ListingTypeFilter = (typeof marketplaceListingTypes)[number]['value'];

export default function MarketplaceClient({ initialData }: { initialData: MarketplacePageData }) {
  const { query, createMutation, updateMutation, statusMutation, deleteMutation, reportMutation } =
    useMarketplace(initialData);
  const data = query.data;
  const [search, setSearch] = useState('');
  const [listingType, setListingType] = useState<ListingTypeFilter>('all');
  const [category, setCategory] = useState<(typeof marketplaceCategories)[number]>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [reportListing, setReportListing] = useState<MarketplaceListing | null>(null);
  const [actionError, setActionError] = useState('');

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return data.listings.filter((listing) => {
      const matchesType = listingType === 'all' || listing.listingType === listingType;
      const matchesCategory = category === 'All' || listing.category === category;
      const matchesSearch =
        !normalizedSearch ||
        [
          listing.title,
          listing.category,
          listing.listingType,
          listing.location,
          listing.fitLabel || '',
          listing.seller.name,
          listing.description,
          ...listing.highlights,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesType && matchesCategory && matchesSearch;
    });
  }, [category, data.listings, listingType, search]);

  const liveListingCount = data.myListings.filter(
    (listing) => listing.status === 'active' || listing.status === 'hidden'
  ).length;
  const revenueOrganization = data.viewer?.revenueOrganization || null;
  const mayCreate = Boolean(
    data.viewer &&
      revenueOrganization?.canCreateRevenueFeatures &&
      data.viewer.isPhoneVerified &&
      liveListingCount < data.listingLimit
  );

  const openCreateFlow = () => {
    if (!data.viewer) {
      window.location.href = '/?login=1&next=%2Fmarketplace';
      return;
    }
    if (!mayCreate) return;
    setEditingListing(null);
    setFormOpen(true);
  };

  const profileHref = data.viewer?.role === 'expert' ? '/experts/me' : data.viewer?.role === 'admin' ? '/admin' : '/participants/me';

  const submitListing = async (input: MarketplaceListingInput) => {
    if (editingListing) await updateMutation.mutateAsync({ id: editingListing.id, input });
    else await createMutation.mutateAsync(input);
  };

  const updateStatus = async (listing: MarketplaceListing, status: MarketplaceListingStatus) => {
    if (status === 'sold' && !window.confirm(`Mark "${listing.title}" as sold?`)) return;
    setActionError('');
    try {
      await statusMutation.mutateAsync({ id: listing.id, status });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update the listing.');
    }
  };

  const deleteListing = async (listing: MarketplaceListing) => {
    if (!window.confirm(`Delete "${listing.title}"? This removes it from your marketplace dashboard.`)) return;
    setActionError('');
    try {
      await deleteMutation.mutateAsync(listing.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not delete the listing.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-lg border border-emerald-900/10 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-5 py-8 sm:px-8 lg:py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Bike className="h-3.5 w-3.5" aria-hidden="true" /> Rider marketplace
            </span>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold tracking-normal text-gray-950 dark:text-white sm:text-5xl">
              Buy and sell cycles, parts, and ride accessories.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-slate-300">
              Find useful gear from verified local organizations, cycle hubs, and local riding teams.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={openCreateFlow} disabled={Boolean(data.viewer) && !mayCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                <Plus className="h-4 w-4" aria-hidden="true" /> List an item
              </button>
              <Link href="/store-locator" className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
                Find a cycle hub for inspection
              </Link>
            </div>
            {data.viewer && !revenueOrganization?.canCreateRevenueFeatures ? (
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
                Marketplace posting is available to verified organizations with an active subscription.{' '}
                <Link href="/organizations/subscription" className="font-bold underline underline-offset-2">
                  View the Partner Plan
                </Link>
              </p>
            ) : data.viewer && !data.viewer.isPhoneVerified ? (
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
                <Link href={profileHref} className="font-bold underline underline-offset-2">Verify your phone number</Link> to post marketplace items.
              </p>
            ) : liveListingCount >= data.listingLimit ? (
              <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">You are using all {data.listingLimit} live listing slots. Mark an item sold or delete one before posting another.</p>
            ) : null}
          </div>
          <div className="relative min-h-[280px] bg-gray-100 dark:bg-slate-800 sm:min-h-[360px]">
            <Image src="https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=1200&q=80" alt="Mountain bike beside a riding trail" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-950/90">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                <p className="text-sm leading-6 text-gray-700 dark:text-slate-200">Meet in public, inspect condition carefully, and use a local hub for a safety check when needed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {data.viewer ? (
        <div className="space-y-3">
          {actionError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{actionError}</p> : null}
          <MarketplaceOwnerPanel
            listings={data.myListings}
            listingLimit={data.listingLimit}
            onEdit={(listing) => { setEditingListing(listing); setFormOpen(true); }}
            onStatusChange={(listing, status) => void updateStatus(listing, status)}
            onDelete={(listing) => void deleteListing(listing)}
          />
        </div>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">Available marketplace items</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{filteredListings.length} listing{filteredListings.length === 1 ? '' : 's'} available now.</p>
          </div>
          <div className="grid w-full gap-3 lg:w-auto lg:min-w-[680px] lg:grid-cols-[minmax(220px,1fr)_180px_190px]">
            <label className="relative">
              <span className="sr-only">Search marketplace listings</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search model, part, city, fit..." className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by item type</span>
              <PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <select value={listingType} onChange={(event) => setListingType(event.target.value as ListingTypeFilter)} className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-8 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {marketplaceListingTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">Filter by category</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <select value={category} onChange={(event) => setCategory(event.target.value as (typeof marketplaceCategories)[number])} className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-8 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {marketplaceCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </div>

        {filteredListings.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                isOwner={data.viewer?.id === listing.ownerUserId}
                onReport={(target) => {
                  if (!data.viewer) window.location.href = '/?login=1&next=%2Fmarketplace';
                  else setReportListing(target);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">No marketplace items found</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">Try another search, item type, or category.</p>
          </div>
        )}
      </section>

      <MarketplaceListingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        listing={editingListing}
        viewer={data.viewer}
        onSubmit={submitListing}
      />
      <MarketplaceReportDialog
        listing={reportListing}
        onOpenChange={(open) => { if (!open) setReportListing(null); }}
        onSubmit={async (reason: MarketplaceReportReason, details: string) => {
          if (!reportListing) return;
          await reportMutation.mutateAsync({ id: reportListing.id, reason, details });
        }}
      />
    </div>
  );
}
