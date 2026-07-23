'use client';

import { ExternalLink, Megaphone } from 'lucide-react';
import type { OrganizationPromotion } from './hooks/use-organization-detail';

export default function OrganizationPromotionsSection({
  promotions,
  organizationName,
}: {
  promotions: OrganizationPromotion[];
  organizationName: string;
}) {
  const promotion = promotions[0];
  if (!promotion) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-emerald-200/70 bg-white shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        {promotion.image_url ? (
          <div className="relative min-h-48 bg-emerald-950 md:min-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={promotion.image_url}
              alt=""
              className="h-full min-h-48 w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center bg-emerald-50 dark:bg-emerald-950/35">
            <Megaphone className="h-10 w-10 text-emerald-700 dark:text-emerald-300" />
          </div>
        )}
        <div className="p-5">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            <Megaphone className="h-3.5 w-3.5" />
            Partner spotlight
          </p>
          <h2 className="mt-3 text-xl font-bold text-gray-950 dark:text-white">{promotion.title}</h2>
          {promotion.description && (
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{promotion.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {promotion.cta_url && (
              <a
                href={promotion.cta_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-emerald-950"
              >
                {promotion.cta_label || 'Learn more'}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <span className="text-xs text-gray-500 dark:text-slate-400">From {organizationName}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
