import type { Metadata } from 'next';
import pool from '@/lib/db';
import type { CommunityResource } from '@/types';
import ToolkitDirectoryView from '@/components/toolkit/toolkit-directory-view';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600; // 1 hour ISR

export const metadata: Metadata = {
  title: 'Curated Nepal MTB & Hiking Toolkit | Essential Apps, Weather & Repair Tools',
  description:
    'Discover essential GPS and route planning apps (Strava, Komoot, Gaia GPS, OsmAnd), mountain weather & flood radars (Windy, Nepal DHM), emergency repair tools, and top mountain biking YouTube channels for riding and hiking in Nepal.',
  keywords: [
    'Strava Nepal',
    'Komoot Nepal cycling',
    'Nepal MTB apps',
    'hiking navigation apps Nepal',
    'offline GPS Nepal trails',
    'Gaia GPS Nepal',
    'mountain bike repair tutorials',
    'Himalayan weather radar',
    'bikepacking tools Nepal',
    'Windy Nepal radar',
    'LocoXperts toolkit',
  ],
  alternates: {
    canonical: absoluteUrl('/toolkit'),
  },
  openGraph: {
    title: 'Essential MTB & Hiking Toolkit for Nepal Trails — Apps, Tools & Channels',
    description:
      'Curated directory of Strava, Komoot, offline GPS apps, mountain storm radars, trailside repair tools, and bike channels tested by experts for Himalayan routes.',
    url: absoluteUrl('/toolkit'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Essential MTB & Hiking Toolkit for Nepal — Apps, Radar & Tools',
    description:
      'Hand-picked GPS apps including Strava and Komoot, storm radars, repair tools, and YouTube channels for riding and trekking across Nepal.',
  },
};

async function getInitialResources(): Promise<CommunityResource[]> {
  try {
    const result = await pool.query<CommunityResource>(`
      SELECT 
        id, title, slug, description, category, sport_type, pricing_type, price_note,
        external_url, icon_or_logo_url, youtube_handle_or_channel_id,
        is_verified_by_locoxperts, is_featured, platforms, tags, metadata,
        display_order, created_at, updated_at
      FROM community_resources
      ORDER BY is_featured DESC, display_order ASC, title ASC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching initial community resources for SSR:', error);
    return [];
  }
}

export default async function ToolkitPage() {
  const initialResources = await getInitialResources();

  // Structured Data (JSON-LD) for Rich Results & Google Knowledge Graph
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Curated Nepal MTB & Hiking Toolkit — Apps, Weather & Field Gear',
    description:
      'Hand-picked offline GPS navigation apps, mountain weather radars, repair tutorials, and field tools tested for Nepal trails.',
    url: absoluteUrl('/toolkit'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: initialResources.map((resource, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'SoftwareApplication',
          name: resource.title,
          description: resource.description,
          url: resource.external_url,
          applicationCategory: resource.category,
          offers: {
            '@type': 'Offer',
            price: resource.pricing_type === 'free' ? '0' : undefined,
            priceCurrency: 'USD',
          },
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolkitDirectoryView initialResources={initialResources} />
    </>
  );
}
