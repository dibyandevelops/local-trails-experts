import type { Metadata } from 'next';
import StoreLocatorClient from '@/components/feature-components/store-locator/store-locator-client';

export const metadata: Metadata = {
  title: 'Store Locator',
  description:
    'Find trusted bike shops, gear stores, and support hubs near Kathmandu and Pokhara.',
  alternates: { canonical: '/store-locator' },
};

export default function StoreLocatorPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-hero-border/70 bg-gradient-to-br from-hero-from via-hero-via to-hero-to px-6 py-8 shadow-sm md:px-10 md:py-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-hero-glow/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-hero-glow/30 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Feature
            </span>
            <span className="rounded-full border border-hero-border/80 bg-hero-pill/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-hero-pill-text">
              Store Locator
            </span>
          </div>
          <h1 className="text-balance text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Find trusted support hubs near your trail
          </h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Discover bike shops and gear partners in Kathmandu and Pokhara. This
            list will expand as local teams add verified stores.
          </p>
        </div>
      </section>

      <StoreLocatorClient />
    </div>
  );
}
