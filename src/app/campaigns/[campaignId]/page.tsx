import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CampaignSupportModal from '@/components/feature-components/campaigns/campaign-support-modal';
import {
  getPublicCampaignDetail,
  getPublicCampaignMetadata,
  type CampaignDetail,
} from '@/lib/data/public-campaigns';

function formatDate(dateLike: string | null) {
  if (!dateLike) return null;
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function canSponsorCampaign(status: CampaignDetail['status']) {
  return status === 'active' || status === 'looking_for_funds';
}

function formatCampaignStatus(status: CampaignDetail['status']) {
  if (status === 'looking_for_funds') return 'Looking for funds';
  return status;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}): Promise<Metadata> {
  const { campaignId } = await params;
  const campaign = await getPublicCampaignMetadata(campaignId);

  if (!campaign) {
    return {
      title: 'Campaign not found',
    };
  }

  return {
    title: campaign.title,
    description: campaign.description || 'Support this trail campaign.',
    alternates: { canonical: `/campaigns/${campaignId}` },
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getPublicCampaignDetail(campaignId);

  if (!campaign) {
    notFound();
  }

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
            {formatCampaignStatus(campaign.status)}
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
              {canSponsorCampaign(campaign.status)
                ? 'Commit an amount, scan the payment QR, and upload proof so the trail builder can verify your support.'
                : 'This campaign is not currently accepting direct sponsorships.'}
            </p>
            {canSponsorCampaign(campaign.status) && campaign.payment_note && (
              <p className="mt-2 rounded-md border border-emerald-200 bg-white/80 p-2 text-xs dark:border-emerald-900/60 dark:bg-slate-900/70">
                {campaign.payment_note}
              </p>
            )}
            {canSponsorCampaign(campaign.status) && (
              <div className="mt-3">
                <CampaignSupportModal
                  campaignId={campaign.id}
                  campaignTitle={campaign.title}
                  organizationName={campaign.organization_name}
                  organizationSlug={campaign.organization_slug}
                  targetAmount={target}
                  raisedAmount={raised}
                  progress={progress}
                  qrImageUrl={campaign.qr_image_url}
                  paymentNote={campaign.payment_note}
                  contactEmail={campaign.organization_contact_email}
                  contactPhone={campaign.organization_contact_phone}
                  whatsappUrl={campaign.organization_whatsapp_url}
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <p className="font-semibold">Trail builder</p>
            <p className="mt-1">
              Review who is managing this campaign and the trails they are associated with.
            </p>
            <Link
              href={`/organizations/${campaign.organization_slug}`}
              className="mt-3 inline-flex rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View trail builder
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
