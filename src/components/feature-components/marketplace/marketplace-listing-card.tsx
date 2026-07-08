'use client';

import Image from 'next/image';
import { CheckCircle2, ChevronLeft, ChevronRight, Flag, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
  formatMarketplacePrice,
  type MarketplaceListing,
  type MarketplaceListingCondition,
} from '@/lib/marketplace';

const conditionLabel: Record<MarketplaceListingCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  needs_service: 'Needs service',
};

function phoneDigits(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `977${digits}` : digits;
}

export default function MarketplaceListingCard({
  listing,
  isOwner,
  onReport,
}: {
  listing: MarketplaceListing;
  isOwner: boolean;
  onReport: (listing: MarketplaceListing) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const safeImageIndex = Math.min(imageIndex, Math.max(0, listing.images.length - 1));
  const selectedImage = listing.images[safeImageIndex];
  const whatsappMessage = encodeURIComponent(
    `Hi, I saw your ${listing.title} on LocoXperts. Is it still available?`
  );

  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800">
        {selectedImage ? (
          <Image
            src={selectedImage}
            alt={`${listing.title}, photo ${safeImageIndex + 1} of ${listing.images.length}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold capitalize text-gray-900 shadow-sm dark:bg-slate-950/90 dark:text-white">
            {listing.listingType}
          </span>
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-900 shadow-sm dark:bg-slate-950/90 dark:text-white">
            {listing.category}
          </span>
        </div>
        {listing.images.length > 1 ? <>
          <button type="button" onClick={() => setImageIndex((current) => (current - 1 + listing.images.length) % listing.images.length)} className="absolute bottom-3 left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={`Previous photo of ${listing.title}`} title="Previous photo"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">{safeImageIndex + 1}/{listing.images.length}</span>
          <button type="button" onClick={() => setImageIndex((current) => (current + 1) % listing.images.length)} className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={`Next photo of ${listing.title}`} title="Next photo"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </> : null}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-950 dark:text-white">{listing.title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {listing.location}{listing.fitLabel ? ` · ${listing.fitLabel}` : ''}
            </p>
          </div>
          <p className="shrink-0 text-sm font-extrabold text-emerald-800 dark:text-lime-300">
            {formatMarketplacePrice(listing.priceNpr)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {conditionLabel[listing.condition]}
          </span>
          {listing.seller.isVerified ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified seller
            </span>
          ) : null}
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
          {listing.description}
        </p>

        {listing.highlights.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-gray-700 dark:text-slate-300">
            {listing.highlights.slice(0, 3).map((highlight) => (
              <li key={highlight} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-slate-800 dark:text-slate-400">
          <span>Seller: {listing.seller.name}</span>
          {!isOwner ? (
            <button
              type="button"
              onClick={() => onReport(listing)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800"
              aria-label={`Report ${listing.title}`}
              title="Report listing"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {listing.contactMethods.includes('whatsapp') && listing.seller.phone ? (
            <a
              href={`https://wa.me/${phoneDigits(listing.seller.phone)}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
          ) : null}
          {listing.contactMethods.includes('phone') && listing.seller.phone ? (
            <a
              href={`tel:${listing.seller.phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> Call
            </a>
          ) : null}
          {listing.contactMethods.includes('email') && listing.seller.email ? (
            <a
              href={`mailto:${listing.seller.email}?subject=${encodeURIComponent(listing.title)}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
