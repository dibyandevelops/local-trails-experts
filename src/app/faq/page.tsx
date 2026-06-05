import {
  InfoCard,
  InfoCardTitle,
  InfoLink,
  InfoPageHero,
  InfoPageShell,
} from '@/components/ui/info-page';

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

const faqGroups: Array<{ title: string; items: FaqItem[] }> = [
  {
    title: 'Trails and ride support',
    items: [
      {
        question: 'What trail information can I find?',
        answer:
          'Trail pages can include map route, sport type, distance, elevation, estimated time, difficulty, route guide, services, trail updates, campaigns, and associated experts when available.',
      },
      {
        question: 'Can I request a custom trail ride?',
        answer:
          'Yes. Use the trail request option on a trail page and share your preferred date, timing, nearest point, and support details.',
      },
      {
        question: 'How are hazards or safety updates handled?',
        answer:
          'Admins and authorized organization users can publish trail updates. Active alerts are surfaced on relevant trail pages so riders can make better decisions.',
      },
    ],
  },
  {
    title: 'Events and bookings',
    items: [
      {
        question: 'How do I join an event?',
        answer:
          'Open the event page, review the details, and use the join action. For paid events, complete the payment step if it is required by the organizer.',
      },
      {
        question: 'When is a paid booking confirmed?',
        answer:
          'A paid booking is confirmed after payment proof or payment status is verified through the event workflow.',
      },
      {
        question: 'Why can’t I join some events?',
        answer:
          'Events may be full, already past their date, or unavailable for booking. You can still read event and route details when public.',
      },
    ],
  },
  {
    title: 'Experts and organizations',
    items: [
      {
        question: 'How do experts get verified?',
        answer:
          'Experts submit profile and application details. Admin reviews the information and may request more context before approval.',
      },
      {
        question: 'What can organizations manage?',
        answer:
          'Approved organizations can be associated with trails and may manage relevant trail updates, gallery items, services, campaigns, and organization information depending on their permissions.',
      },
      {
        question: 'Can shops and partners be listed?',
        answer:
          'Yes. Cycle hubs and partners can be listed after review, so the platform stays useful without turning into an unmanaged directory.',
      },
    ],
  },
  {
    title: 'Privacy, safety, and accounts',
    items: [
      {
        question: 'Do you sell personal data?',
        answer: 'No. LocoXperts does not sell personal data.',
      },
      {
        question: 'Where can I read the policies?',
        answer: (
          <>
            Read the <InfoLink href="/privacy">Privacy Policy</InfoLink>,{' '}
            <InfoLink href="/terms">Terms & Conditions</InfoLink>, and{' '}
            <InfoLink href="/safety">Safety Policy</InfoLink>.
          </>
        ),
      },
      {
        question: 'How can I request account deletion?',
        answer: (
          <>
            Use the account deletion flow on the <InfoLink href="/privacy">Privacy Policy</InfoLink>{' '}
            page. Requests are reviewed manually for safety and compliance.
          </>
        ),
      },
    ],
  },
];

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <InfoCard>
      <InfoCardTitle>{title}</InfoCardTitle>
      <div className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-slate-800 dark:border-slate-800">
        {items.map((item) => (
          <details key={item.question} className="group bg-white dark:bg-slate-950/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm font-bold text-gray-950 marker:content-none dark:text-white">
              <span>{item.question}</span>
              <span className="text-lg leading-none text-emerald-700 transition group-open:rotate-45 dark:text-emerald-300">
                +
              </span>
            </summary>
            <div className="px-4 pb-4 text-sm leading-7 text-gray-700 dark:text-slate-300">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </InfoCard>
  );
}

export default function FaqPage() {
  return (
    <InfoPageShell maxWidth="5xl">
      <InfoPageHero
        eyebrow="Help center"
        title="Quick answers before you ride, book, or contribute."
        description="A compact guide to the most common questions about trails, ride support, events, experts, organizations, safety, and privacy."
        actions={[
          { label: 'Browse trails', href: '/trails' },
          { label: 'Read safety policy', href: '/safety', variant: 'secondary' },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {faqGroups.map((group) => (
          <FaqSection key={group.title} title={group.title} items={group.items} />
        ))}
      </div>
    </InfoPageShell>
  );
}
