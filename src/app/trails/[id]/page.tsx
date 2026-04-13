import type { Metadata } from 'next';
import type { RouteData, Trail } from '@/types';
import pool from '@/lib/db';
import TrailPageClient from './trail-page-client';

export const revalidate = 300;

type Params = {
  id: string;
};

function buildTrailMetadata(trail: Trail): Metadata {
  const title = `${trail.name} • Trail Guide | LocoXperts`;
  const description =
    trail.description?.trim() ||
    `Explore ${trail.name} in Nepal. View distance, elevation, route guide, and local trail insights.`;
  const image = trail.image_url || (Array.isArray(trail.trail_images) ? trail.trail_images[0] : null);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: image ? [{ url: image, alt: trail.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

async function fetchPublicTrailById(id: string): Promise<Trail | null> {
  const result = await pool.query(
    `
    SELECT
      t.*,
      CASE
        WHEN u.role = 'admin' THEN 'LocoMTBGroup'
        ELSE u.name
      END AS created_by,
      u.name AS submitted_by_name,
      u.email AS submitted_by_email
    FROM trails t
    LEFT JOIN users u ON t.submitted_by_user_id = u.id
    WHERE t.id = $1 AND t.status = 'approved' AND t.is_hidden = FALSE
    LIMIT 1
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const trail = result.rows[0] as Trail & { route_data?: unknown; trail_images?: unknown };

  if (trail.route_data && typeof trail.route_data === 'string') {
    try {
      trail.route_data = JSON.parse(trail.route_data) as RouteData;
    } catch {
      trail.route_data = null;
    }
  }

  if (!Array.isArray(trail.trail_images)) {
    trail.trail_images = [];
  }

  return trail;
}

export async function generateStaticParams() {
  try {
    const result = await pool.query(
      `
      SELECT id
      FROM trails
      WHERE status = 'approved' AND is_hidden = FALSE
      ORDER BY updated_at DESC
      LIMIT 1000
      `
    );

    return result.rows.map((row: { id: string }) => ({ id: row.id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const trail = await fetchPublicTrailById(id);

  if (!trail) {
    return {
      title: 'Trail Not Found | LocoXperts',
      description: 'The requested trail is unavailable.',
    };
  }

  return buildTrailMetadata(trail);
}

export default async function TrailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const initialTrail = await fetchPublicTrailById(id);

  return <TrailPageClient trailId={id} initialTrail={initialTrail} />;
}
