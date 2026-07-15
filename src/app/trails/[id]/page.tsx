import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TrailPageClient from './trail-page-client';
import { isUuidLike } from '@/lib/trail-slug';
import {
  fetchPublicTrailByIdentifier,
  getTrailSeo,
  getPublicTrailStaticParams,
} from '@/lib/data/public-trails';
import { getPublicRideNotesForTrail } from '@/lib/data/public-ride-notes';
import { absoluteUrl, SITE_NAME } from '@/lib/seo';
import { getTrailShareDescription, getTrailShareTitle } from '@/lib/trail-share';

export const revalidate = 300;

type Params = {
  id: string;
};

export async function generateStaticParams() {
  try {
    return await getPublicTrailStaticParams();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id: identifier } = await params;
  const trail = await getTrailSeo(identifier);

  if (!trail) {
    return {
      title: 'Trail not found',
      robots: { index: false, follow: false },
    };
  }

  const shareId = trail.slug || trail.id;
  const title = getTrailShareTitle(trail);
  const description = getTrailShareDescription(trail);
  const imagePath = `/trails/${shareId}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: `/trails/${shareId}` },
    openGraph: {
      title,
      description,
      url: `/trails/${shareId}`,
      siteName: SITE_NAME,
      type: 'article',
      images: [
        {
          url: absoluteUrl(imagePath),
          width: 1200,
          height: 630,
          alt: `${trail.name} trail preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(imagePath)],
    },
  };
}

export default async function TrailPage({ params }: { params: Promise<Params> }) {
  const { id: identifier } = await params;
  const initialTrail = await fetchPublicTrailByIdentifier(identifier);

  if (initialTrail?.slug && isUuidLike(identifier) && initialTrail.matched_by === 'id') {
    redirect(`/trails/${initialTrail.slug}`);
  }

  const rideNotes = initialTrail?.id
    ? await getPublicRideNotesForTrail(initialTrail.id, 3)
    : [];

  return (
    <TrailPageClient
      trailId={initialTrail?.id || identifier}
      initialTrail={initialTrail}
      rideNotes={rideNotes}
    />
  );
}
