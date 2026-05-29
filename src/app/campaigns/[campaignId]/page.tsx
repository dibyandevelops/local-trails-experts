import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import pool from '@/lib/db';

type CampaignDetail = {
  id: string;
  title: string;
  description: string | null;
  target_amount_npr: string;
  raised_amount_npr: string;
  qr_image_url: string | null;
  payment_note: string | null;
  status: 'active' | 'completed' | 'paused';
  starts_at: string | null;
  ends_at: string | null;
  organization_name: string;
  organization_slug: string;
  trail_id: string | null;
  trail_name: string | null;
  updated_at: string;
};

function formatDate(dateLike: string | null) {
  if (!dateLike) return null;
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}): Promise<Metadata> {
  const { campaignId } = await params;
  const result = await pool.query(
    `
    SELECT fc.title, fc.description
    FROM fundraising_campaigns fc
    JOIN organizations o ON o.id = fc.organization_id
    WHERE fc.id = $1
      AND fc.status IN ('active', 'completed', 'paused')
      AND o.is_active = TRUE
    LIMIT 1
    `,
    [campaignId]
  );

  if (!result.rows.length) {
    return {
      title: 'Campaign not found',
    };
  }

  const row = result.rows[0] as { title: string; description: string | null };
  return {
    title: row.title,
    description: row.description || 'Support this trail campaign.',
    alternates: { canonical: `/campaigns/${campaignId}` },
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const result = await pool.query(
    `
    SELECT
      fc.id,
      fc.title,
      fc.description,
      fc.target_amount_npr::text,
      fc.raised_amount_npr::text,
      fc.qr_image_url,
      fc.payment_note,
      fc.status,
      fc.starts_at::text,
      fc.ends_at::text,
      fc.updated_at::text,
      o.name AS organization_name,
      o.slug AS organization_slug,
      t.id AS trail_id,
      t.name AS trail_name
    FROM fundraising_campaigns fc
    JOIN organizations o ON o.id = fc.organization_id
    LEFT JOIN trails t ON t.id = fc.trail_id
    WHERE fc.id = $1
      AND fc.status IN ('active', 'completed', 'paused')
      AND o.is_active = TRUE
    LIMIT 1
    `,
    [campaignId]
  );

  if (!result.rows.length) {
    notFound();
  }

  const campaign = result.rows[0] as CampaignDetail;
  const target = Number(campaign.target_amount_npr || 0);
  const raised = Number(campaign.raised_amount_npr || 0);
  const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const startsAt = formatDate(campaign.starts_at);
  const endsAt = formatDate(campaign.ends_at);
  const updatedAt = formatDate(campaign.updated_at);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/campaigns"
          className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to campaigns
        </Link>
        <Link
          href={`/organizations/${campaign.organization_slug}`}
          className="text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
        >
          {campaign.organization_name}
        </Link>
      </div>

      <header className="rounded-2xl border border-emerald-200/70 bg-white p-6 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {campaign.status}
          </span>
          {updatedAt && (
            <span className="text-xs text-gray-500 dark:text-slate-400">Updated: {updatedAt}</span>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{campaign.title}</h1>
        {campaign.description && (
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{campaign.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">
          {campaign.trail_id && campaign.trail_name && (
            <Link
              href={`/trails/${campaign.trail_id}`}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Trail: {campaign.trail_name}
            </Link>
          )}
          {startsAt && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
              Starts: {startsAt}
            </span>
          )}
          {endsAt && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
              Ends: {endsAt}
            </span>
          )}
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Progress and contribution
        </h2>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-100">
          NPR {raised.toLocaleString()} raised of NPR {target.toLocaleString()} ({progress}%)
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-semibold">How to support</p>
            <p className="mt-1">
              Use the campaign QR/payment details and mention this campaign title in your note.
            </p>
            {campaign.payment_note && (
              <p className="mt-2 rounded-md border border-emerald-200 bg-white/80 p-2 text-xs dark:border-emerald-900/60 dark:bg-slate-900/70">
                {campaign.payment_note}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <p className="font-semibold">For organizations and sponsors</p>
            <p className="mt-1">
              If your company wants to co-fund this initiative, use the sponsorship flow.
            </p>
            <Link
              href="/sponsors"
              className="mt-3 inline-flex rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
            >
              Start sponsor inquiry
            </Link>
          </div>
        </div>

        {campaign.qr_image_url && (
          <div className="mt-5">
            <a
              href={campaign.qr_image_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              Open payment QR
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
