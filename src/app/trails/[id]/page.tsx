import { redirect } from 'next/navigation';
import TrailPageClient from './trail-page-client';
import { isUuidLike } from '@/lib/trail-slug';
import {
  fetchPublicTrailByIdentifier,
  getPublicTrailStaticParams,
} from '@/lib/data/public-trails';
import { getPublicRideNotesForTrail } from '@/lib/data/public-ride-notes';

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
