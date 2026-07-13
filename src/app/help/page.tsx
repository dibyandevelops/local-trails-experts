import type { Metadata } from 'next';
import {
  InfoCard,
  InfoCardTitle,
  InfoLink,
  InfoList,
  InfoPageHero,
  InfoPageShell,
  InfoText,
} from '@/components/ui/info-page';

export const metadata: Metadata = {
  title: 'Help & Platform Guide',
  description:
    'Learn how to use LocoXperts for trails, local guides, events, organizations, marketplace listings, and ride support.',
  alternates: { canonical: '/help' },
};

const riderGuides = [
  {
    title: 'Find a trail to ride',
    items: [
      'Open Trails and search by place, trail name, difficulty, or activity.',
      'Use filters when you know your ride level, distance, or preferred activity.',
      'Open a trail page to review map route, difficulty, distance, elevation, updates, services, and associated local experts.',
      'If the route feels too unknown, use the trail request option or book local guide support where available.',
    ],
  },
  {
    title: 'Request local ride support',
    items: [
      'Open the trail or ride support page connected to the route you want to explore.',
      'Share preferred date, time, nearest meeting point, support needs, and rider level.',
      'A guide, expert, or admin can review the request and respond from their dashboard.',
      'Use the request details to agree on timing, route expectations, and safety context before the ride.',
    ],
  },
  {
    title: 'Join events and community rides',
    items: [
      'Browse Events or Community Rides to find upcoming ride opportunities.',
      'Open the event page and review date, location, host, route notes, price, and capacity.',
      'Join free events directly or follow the payment/proof flow for paid events when required.',
      'Use event details to prepare your bike, gear, and arrival plan before the ride.',
    ],
  },
];

const sellerGuides = [
  {
    title: 'Create a marketplace listing',
    items: [
      'Log in with a phone-verified account.',
      'Open Marketplace and choose List an item.',
      'Choose whether you are selling a cycle, part, or accessory.',
      'Add clear photos, price, location, condition, description, and one contact preference.',
      'Publish the listing, then manage it from Your listings.',
    ],
  },
  {
    title: 'Manage your marketplace item',
    items: [
      'Use Edit to update title, photos, description, price, location, condition, or contact value.',
      'Use Hide when you want to pause public visibility without deleting the item.',
      'Use Mark sold when the item is no longer available.',
      'Use Delete to remove the item from normal marketplace views.',
    ],
  },
];

const expertGuides = [
  {
    title: 'Become a local guide',
    items: [
      'Open the local guide registration page and submit concise experience details.',
      'Include sports, city, trail knowledge, phone details, and supporting verification context.',
      'After review, verified guides can create ride programs, upload trails, and manage guide-facing requests.',
    ],
  },
  {
    title: 'Create an organization',
    items: [
      'Verified experts can create one organization for teams, campaigns, trail services, and local programs.',
      'Organizations can invite members, associate trails, publish services, create campaigns, and share updates.',
      'Use organization tools when the work is bigger than one individual guide profile.',
    ],
  },
];

function GuideSection({
  title,
  guides,
}: {
  title: string;
  guides: Array<{ title: string; items: string[] }>;
}) {
  const gridClass = guides.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2';

  return (
    <InfoCard>
      <InfoCardTitle>{title}</InfoCardTitle>
      <div className={`mt-4 grid gap-4 ${gridClass}`}>
        {guides.map((guide) => (
          <div key={guide.title} className="flex h-full flex-col rounded-2xl border border-gray-200 p-4 dark:border-slate-800">
            <h3 className="text-sm font-black text-gray-950 dark:text-white">{guide.title}</h3>
            <InfoList items={guide.items} />
          </div>
        ))}
      </div>
    </InfoCard>
  );
}

export default function HelpPage() {
  return (
    <InfoPageShell maxWidth="5xl">
      <InfoPageHero
        eyebrow="Platform help"
        title="How to use LocoXperts without guessing where to click next."
        description="A practical guide for riders, sellers, local guides, organizations, and partners using the platform."
        actions={[
          { label: 'Browse trails', href: '/trails' },
          { label: 'Read FAQ', href: '/faq', variant: 'secondary' },
        ]}
      />

      <GuideSection title="For riders" guides={riderGuides} />
      <GuideSection title="For marketplace sellers" guides={sellerGuides} />
      <GuideSection title="For local guides and organizations" guides={expertGuides} />

      <InfoCard>
        <InfoCardTitle>Still unsure?</InfoCardTitle>
        <div className="mt-3 space-y-3">
          <InfoText>
            If you are unsure whether to request a guide, join an event, or choose a trail, start
            with the easiest action: browse nearby trails and compare difficulty, distance, and
            route context.
          </InfoText>
          <InfoText>
            For policy questions, read the <InfoLink href="/safety">Safety Policy</InfoLink>,{' '}
            <InfoLink href="/privacy">Privacy Policy</InfoLink>, and{' '}
            <InfoLink href="/terms">Terms & Conditions</InfoLink>.
          </InfoText>
        </div>
      </InfoCard>
    </InfoPageShell>
  );
}
