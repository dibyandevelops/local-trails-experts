import Link from 'next/link';
import type { OrganizationCampaign } from './hooks/use-organization-detail';

function getCampaignStatusBadge(status: OrganizationCampaign['status']) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
      };
    case 'looking_for_funds':
      return {
        label: 'Looking for funds',
        className:
          'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200',
      };
    case 'completed':
      return {
        label: 'Completed',
        className:
          'border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-900/60 dark:bg-lime-950/40 dark:text-lime-200',
      };
    case 'paused':
      return {
        label: 'Paused',
        className:
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
      };
    case 'archived':
      return {
        label: 'Archived',
        className:
          'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
      };
    default:
      return {
        label: 'Draft',
        className:
          'border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      };
  }
}

export default function OrganizationCampaignsSection({
  campaigns,
}: {
  campaigns: OrganizationCampaign[];
}) {
  if (campaigns.length === 0) return null;

  return (
    <section className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Support Campaigns
        </h2>
        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
          {campaigns.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {campaigns.map((campaign) => {
          const target = Number(campaign.target_amount_npr || 0);
          const raised = Number(campaign.raised_amount_npr || 0);
          const progress = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
          const statusBadge = getCampaignStatusBadge(campaign.status);
          return (
            <article
              key={campaign.id}
              className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900/60 dark:bg-slate-950/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {campaign.title}
                </h3>
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              {campaign.description && (
                <p className="mt-1 text-xs text-gray-700 dark:text-slate-300">
                  {campaign.description}
                </p>
              )}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-emerald-900 dark:text-emerald-100">
                NPR {raised.toLocaleString()} raised of NPR {target.toLocaleString()} ({progress}%)
              </p>
              <div className="mt-3">
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="inline-flex rounded-md bg-green-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-800 dark:bg-green-500 dark:text-slate-950 dark:hover:bg-green-400"
                >
                  View campaign
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
  );
}
