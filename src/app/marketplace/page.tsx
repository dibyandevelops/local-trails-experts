import type { Metadata } from 'next';
import MarketplaceClient from '@/components/feature-components/marketplace/marketplace-client';
import { getServerAuthPayload } from '@/lib/auth-server';
import { getMarketplacePageData } from '@/lib/data/marketplace-listings';

export const metadata: Metadata = {
  title: 'Rider Marketplace',
  description:
    'Browse pre-owned cycles, bike parts, riding accessories, and useful gear from local riders in Nepal.',
  alternates: { canonical: '/marketplace' },
};

export default async function MarketplacePage() {
  const auth = await getServerAuthPayload();
  const initialData = await getMarketplacePageData(auth?.sub);
  return <MarketplaceClient initialData={initialData} />;
}
