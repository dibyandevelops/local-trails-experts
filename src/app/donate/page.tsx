import type { Metadata } from 'next';
import Link from 'next/link';
import { COMMUNITY_NAME } from '@/lib/branding';
import {
  InfoCard,
  InfoCardTitle,
  InfoList,
  InfoPageHero,
  InfoPageShell,
  InfoText,
} from '@/components/ui/info-page';

export const metadata: Metadata = {
  title: 'Donate',
  description:
    `Support ${COMMUNITY_NAME} to map trails across Nepal and fund trail building, fixes, and route signage.`,
  alternates: { canonical: '/donate' },
};

export default function DonatePage() {
  return (
    <InfoPageShell maxWidth="5xl">
      <InfoPageHero
        eyebrow="Support"
        title="Support better trail maps and local trail work."
        description="Contributions help keep LocoXperts useful for riders, experts, trail organizations, and local partners. For specific maintenance work, active campaigns are the best place to contribute."
        actions={[
          { label: 'Support active campaigns', href: '/campaigns' },
          { label: 'Donate to community fund', href: '#community-fund', variant: 'secondary' },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <InfoCard id="community-fund" className="scroll-mt-24">
          <InfoCardTitle>Community fund QR</InfoCardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-[190px_1fr]">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/35">
              <div className="overflow-hidden rounded-xl bg-white p-2">
                {/* SVG is generated in public/donate/esewa-qr.svg */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/donate/esewa-qr.svg"
                  alt="eSewa donation QR code for the LocoXperts Trail Fund"
                  className="h-auto w-full"
                />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-950 dark:text-white">
                LocoXperts Trail Fund
              </p>
              <InfoText>
                Use this QR for general support: mapping, small platform costs, route documentation,
                and community coordination.
              </InfoText>
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                For a trail-specific contribution, prefer active campaigns so progress and usage can be tracked clearly.
              </p>
            </div>
          </div>
        </InfoCard>

        <InfoCard>
          <InfoCardTitle>Where support goes</InfoCardTitle>
          <InfoList
            items={[
              'Trail mapping, route checks, GPX cleanup, and route-guide improvements.',
              'Small trail stewardship needs such as tools, gloves, signage, and trail-day logistics.',
              'Safety context, trail updates, campaign visibility, and organization support workflows.',
              'Platform upkeep so core discovery remains available to the community.',
            ]}
          />
        </InfoCard>
      </div>

      <InfoCard>
        <InfoCardTitle>Transparency practice</InfoCardTitle>
        <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <InfoText>
            Contributions should be handled with clear intent: summarize received support, keep basic
            proof for major expenses, report outcomes, and disclose campaign or sponsor relationships
            when relevant.
          </InfoText>
          <Link
            href="/campaigns"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-lime-300/20 dark:text-lime-50 dark:ring-1 dark:ring-lime-300/30 dark:hover:bg-lime-300/30"
          >
            View campaigns
          </Link>
        </div>
      </InfoCard>
    </InfoPageShell>
  );
}
