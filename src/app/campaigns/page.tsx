import type { Metadata } from 'next';
import Link from 'next/link';
import pool from '@/lib/db';

export const metadata: Metadata = {
  title: 'Trail Campaigns',
  description:
    'Support active Nepal trail campaigns from trusted organizations. Track goals, progress, and where your contribution helps.',
  alternates: { canonical: '/campaigns' },
};

type CampaignRow = {
  id: string;
  title: string;
  description: string | null;
  target_amount_npr: string;
  raised_amount_npr: string;
  status: 'active' | 'completed' | 'paused';
  starts_at: string | null;
  ends_at: string | null;
  organization_name: string;
  organization_slug: string;
  trail_name: string | null;
};

function formatDate(dateLike: string | null) {
  if (!dateLike) return null;
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function CampaignsPage() {
  const result = await pool.query(
    `
    SELECT
      fc.id,
      fc.title,
      fc.description,
      fc.target_amount_npr::text,
      fc.raised_amount_npr::text,
      fc.status,
      fc.starts_at::text,
      fc.ends_at::text,
      o.name AS organization_name,
      o.slug AS organization_slug,
      t.name AS trail_name
    FROM fundraising_campaigns fc
    JOIN organizations o ON o.id = fc.organization_id
    LEFT JOIN trails t ON t.id = fc.trail_id
    WHERE fc.status IN ('active', 'completed', 'paused')
      AND o.is_active = TRUE
    ORDER BY
      CASE fc.status
        WHEN 'active' THEN 1
        WHEN 'paused' THEN 2
        ELSE 3
      END,
      fc.created_at DESC
    `
  );

  const campaigns = result.rows as CampaignRow[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-8 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          Community Funding
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Trail Campaigns in Nepal
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-gray-600 dark:text-slate-300">
          Support real trail maintenance, signage, and route access. Campaigns are run by
          community organizations, with visible targets and progress.
        </p>
      </header>

      {campaigns.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No public campaigns available right now.
        </section>
      ) : (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const target = Number(campaign.target_amount_npr || 0);
            const raised = Number(campaign.raised_amount_npr || 0);
            const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
            const startsAt = formatDate(campaign.starts_at);
            const endsAt = formatDate(campaign.ends_at);
            return (
              <article
                key={campaign.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {campaign.status}
                  </span>
                  <Link
                    href={`/organizations/${campaign.organization_slug}`}
                    className="text-xs font-medium text-cyan-700 hover:underline dark:text-cyan-300"
                  >
                    {campaign.organization_name}
                  </Link>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {campaign.title}
                </h2>
                {campaign.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-slate-300">
                    {campaign.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-slate-300">
                  {campaign.trail_name && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                      Trail: {campaign.trail_name}
                    </span>
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
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-emerald-900 dark:text-emerald-100">
                  NPR {raised.toLocaleString()} / NPR {target.toLocaleString()} ({progress}%)
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="inline-flex rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
                  >
                    View campaign
                  </Link>
                  <Link
                    href="/sponsors"
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    Sponsor this mission
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
