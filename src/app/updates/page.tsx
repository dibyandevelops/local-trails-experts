import type { Metadata } from 'next';
import Link from 'next/link';
import {
  InfoCard,
  InfoCardTitle,
  InfoList,
  InfoPageHero,
  InfoPageShell,
  InfoText,
} from '@/components/ui/info-page';

export const metadata: Metadata = {
  title: 'Platform Updates',
  description:
    'Recent LocoXperts product updates for trails, local guides, organizations, marketplace, events, and support.',
  alternates: { canonical: '/updates' },
};

const updates = [
  {
    date: 'July 2026',
    title: 'Marketplace for cycles, parts, and accessories',
    summary:
      'Riders can browse and sell used cycles, parts, and accessories with photos, condition, price, seller contact preference, reports, and owner/admin controls.',
    href: '/marketplace',
    points: [
      'Phone-verified users can create listings.',
      'Sellers can edit, hide, mark sold, and delete their items.',
      'Admins can moderate reports and update marketplace listings.',
    ],
  },
  {
    date: 'July 2026',
    title: 'Local guide and organization tools',
    summary:
      'Guides and organizations now have a clearer path to publish trails, host ride programs, manage services, run campaigns, and coordinate local work.',
    href: '/experts/join',
    points: [
      'Local guides can upload their own trails after verification.',
      'Organizations can host campaigns, services, programs, and updates.',
      'Expert registration copy is shorter and more focused on local guide work.',
    ],
  },
  {
    date: 'July 2026',
    title: 'Help and rider education pages',
    summary:
      'The platform now includes more guidance for riders who want to find trails, request support, join rides, use the marketplace, or prepare for bigger events.',
    href: '/help',
    points: [
      'New Help page for common platform tasks.',
      'FAQ remains available for policy and general questions.',
      'Post-event ride guidance is now published as a practical Ride Note for local riders.',
    ],
  },
];

export default function UpdatesPage() {
  return (
    <InfoPageShell maxWidth="5xl">
      <InfoPageHero
        eyebrow="Product updates"
        title="What changed on LocoXperts recently."
        description="A simple changelog for riders, local guides, organizations, partners, and admins following the platform's progress."
        actions={[
          { label: 'Open marketplace', href: '/marketplace' },
          { label: 'Read help guide', href: '/help', variant: 'secondary' },
        ]}
      />

      <div className="space-y-4">
        {updates.map((update) => (
          <InfoCard key={update.title}>
            <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-start">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                {update.date}
              </p>
              <div>
                <InfoCardTitle>{update.title}</InfoCardTitle>
                <div className="mt-3">
                  <InfoText>{update.summary}</InfoText>
                </div>
                <InfoList items={update.points} />
              </div>
              <Link
                href={update.href}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-white px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100 dark:hover:bg-emerald-950/40 md:justify-self-end"
              >
                View
              </Link>
            </div>
          </InfoCard>
        ))}
      </div>
    </InfoPageShell>
  );
}
