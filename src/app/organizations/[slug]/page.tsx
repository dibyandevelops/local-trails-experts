import Link from 'next/link';
import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import { getTrailAttributionChipClass, getTrailAttributionLabel } from '@/lib/trail-attribution';

export const dynamic = 'force-dynamic';

type OrgDetail = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  website_url: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
};

type TrailRel = {
  trail_id: string;
  trail_name: string;
  trail_location: string | null;
  relation_type: 'built_by' | 'verified_by' | 'maintained_by';
};

type OrgGalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
};
type FundraisingCampaign = {
  id: string;
  title: string;
  description: string | null;
  target_amount_npr: string;
  raised_amount_npr: string;
  qr_image_url: string | null;
  payment_note: string | null;
  status: 'draft' | 'active' | 'completed' | 'paused' | 'archived';
};

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const orgResult = await pool.query(
    `
    SELECT
      id, slug, name, tagline, description, website_url, city, country, is_verified
    FROM organizations
    WHERE slug = $1 AND is_active = TRUE
    LIMIT 1
    `,
    [slug]
  );

  if (orgResult.rows.length === 0) {
    notFound();
  }

  const org = orgResult.rows[0] as OrgDetail;

  const trailsResult = await pool.query(
    `
    SELECT
      to2.trail_id,
      t.name AS trail_name,
      t.location AS trail_location,
      to2.relation_type
    FROM trail_organizations to2
    JOIN trails t ON t.id = to2.trail_id
    WHERE to2.organization_id = $1
    ORDER BY to2.is_primary DESC, to2.created_at DESC
    `,
    [org.id]
  );
  const trails = trailsResult.rows as TrailRel[];
  const galleryResult = await pool.query(
    `
    SELECT id, image_url, caption
    FROM organization_gallery_items
    WHERE organization_id = $1
    ORDER BY sort_order ASC, created_at DESC
    `,
    [org.id]
  );
  const galleryItems = galleryResult.rows as OrgGalleryItem[];
  const campaignsResult = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      target_amount_npr::text,
      raised_amount_npr::text,
      qr_image_url,
      payment_note,
      status
    FROM fundraising_campaigns
    WHERE organization_id = $1
      AND status IN ('active', 'completed', 'paused')
    ORDER BY created_at DESC
    LIMIT 3
    `,
    [org.id]
  );
  const campaigns = campaignsResult.rows as FundraisingCampaign[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/organizations"
        className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Back to organizations
      </Link>
      <header className="mt-4 rounded-2xl border border-emerald-200/70 bg-white p-6 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-green-800 dark:text-green-200">{org.name}</h1>
          {org.is_verified && (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              Verified
            </span>
          )}
        </div>
        {org.tagline && (
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">{org.tagline}</p>
        )}
        {org.description && (
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{org.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {org.city || 'Nepal'}{org.country ? `, ${org.country}` : ''}
          </span>
          {org.website_url && (
            <a
              href={org.website_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200"
            >
              Website
            </a>
          )}
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trail Contributions</h2>
        {trails.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">No trails linked yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {trails.map((trail) => (
              <article
                key={`${trail.trail_id}-${trail.relation_type}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <p
                  className={`inline-flex max-w-[220px] items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getTrailAttributionChipClass(trail.relation_type)}`}
                  title={`${getTrailAttributionLabel(trail.relation_type)}: ${trail.trail_name}`}
                >
                  <span className="truncate">
                    {getTrailAttributionLabel(trail.relation_type)}
                  </span>
                </p>
                <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {trail.trail_name}
                </h3>
                {trail.trail_location && (
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                    {trail.trail_location}
                  </p>
                )}
                <Link
                  href={`/trails/${trail.trail_id}`}
                  className="mt-3 inline-flex rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  View trail
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {galleryItems.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gallery</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.caption || `${org.name} gallery`}
                  className="h-44 w-full object-cover"
                />
                {item.caption && (
                  <p className="p-3 text-xs text-gray-700 dark:text-slate-300">{item.caption}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {campaigns.length > 0 && (
        <section className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support Campaigns</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Help this organization maintain and improve local trails.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {campaigns.map((campaign) => {
              const target = Number(campaign.target_amount_npr || 0);
              const raised = Number(campaign.raised_amount_npr || 0);
              const progress =
                target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
              return (
                <article
                  key={campaign.id}
                  className="rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900/60 dark:bg-slate-950/40"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {campaign.title}
                  </h3>
                  {campaign.description && (
                    <p className="mt-1 text-xs text-gray-700 dark:text-slate-300">
                      {campaign.description}
                    </p>
                  )}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-emerald-900 dark:text-emerald-100">
                    NPR {raised.toLocaleString()} raised of NPR {target.toLocaleString()} ({progress}%)
                  </p>
                  {campaign.qr_image_url && (
                    <a
                      href={campaign.qr_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                      Open payment QR
                    </a>
                  )}
                  <div className="mt-2">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="inline-flex rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      View campaign details
                    </Link>
                  </div>
                  {campaign.payment_note && (
                    <p className="mt-2 text-[11px] text-gray-600 dark:text-slate-400">
                      {campaign.payment_note}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
