import Link from 'next/link';
import type { OrganizationCampaign } from './hooks/use-organization-detail';

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
          return (
            <article
              key={campaign.id}
              className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900/60 dark:bg-slate-950/40"
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
