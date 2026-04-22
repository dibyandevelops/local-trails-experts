import Link from 'next/link';

type FaqItem = {
  question: string;
  answer: string;
};

const paymentFaqs: FaqItem[] = [
  {
    question: 'How do I pay for a paid event?',
    answer:
      'After you join a paid event, open the payment section on the event details page. You can use the available payment method shown by the organizer and upload payment proof when required.',
  },
  {
    question: 'When is my booking confirmed?',
    answer:
      'For free events, your booking is usually confirmed after joining. For paid events, it is confirmed after payment is verified.',
  },
  {
    question: 'Can I cancel and get a refund?',
    answer:
      'Yes. If a paid booking is cancelled, refund flow is handled from the event details page and tracked with clear refund status labels.',
  },
];

const bookingFaqs: FaqItem[] = [
  {
    question: 'How does booking work?',
    answer:
      'Open an event, review details, and click join. If the event is paid, complete payment. You can monitor booking and payment status directly on the same event page.',
  },
  {
    question: 'Why can’t I join some events?',
    answer:
      'You cannot join events that are full or already past their date. In that case, you can still view route and event information.',
  },
  {
    question: 'Can I request a custom trail ride?',
    answer:
      'Yes. Use the trail request option from trail pages to request a ride with your preferred date and details.',
  },
];

const expertFaqs: FaqItem[] = [
  {
    question: 'How do experts get verified?',
    answer:
      'Experts submit application and profile details. Admin reviews verification details and can ask for additional information before approval.',
  },
  {
    question: 'Can unverified experts create paid events?',
    answer:
      'No. Verification is required for paid hosting workflows. Unverified experts may have limited publishing capabilities based on platform policy.',
  },
  {
    question: 'Is the expert system final?',
    answer:
      'Expert features are currently in beta. Some flows and labels may evolve as we improve reliability and safety.',
  },
];

const trailFaqs: FaqItem[] = [
  {
    question: 'What trail information is available?',
    answer:
      'Trail pages include map route, sport type, distance, elevation, estimated time, difficulty, safety labels, and community reviews when available.',
  },
  {
    question: 'Can I navigate to the route externally?',
    answer:
      'Yes. If a navigation link is available (for example Komoot or Google Maps), a navigation CTA is shown on trail cards or trail details.',
  },
  {
    question: 'How are hazardous trails handled?',
    answer:
      'Admins and authorized experts can flag trails as hazardous so participants can make safer decisions before riding.',
  },
];

const privacyFaqs: FaqItem[] = [
  {
    question: 'What personal data do you store?',
    answer:
      'We store core account and activity data required to run bookings, trail requests, events, and profile features. We do not sell personal data.',
  },
  {
    question: 'Where can I read legal and safety policies?',
    answer:
      'You can review platform policies in the Privacy Policy, Terms & Conditions, and Safety Policy pages.',
  },
  {
    question: 'How can I request account deletion?',
    answer:
      'Use the account deletion request flow on the Privacy Policy page. Deletion is reviewed for safety and compliance before completion.',
  },
];

function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60"
          >
            <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-gray-900 marker:content-none dark:text-slate-100">
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Help Center
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          Quick answers about bookings, payments, experts, trails, privacy, and how LocoXperts works.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href="/privacy"
            className="rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Terms & conditions
          </Link>
          <Link
            href="/safety"
            className="rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Safety policy
          </Link>
        </div>
      </header>

      <FaqSection title="Payments & Refunds" items={paymentFaqs} />
      <FaqSection title="Booking & Participation" items={bookingFaqs} />
      <FaqSection title="Experts & Verification" items={expertFaqs} />
      <FaqSection title="Trails & Route Info" items={trailFaqs} />
      <FaqSection title="Privacy & Data" items={privacyFaqs} />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Who We Are</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          LocoXperts is a Nepal-focused trail and local expert platform that helps riders discover routes,
          connect with experienced hosts, and join safer, better organized outdoor activities.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          Our long-term goal is to keep local trail communities visible, sustainable, and easier to access for
          participants, experts, and supporting partners.
        </p>
      </section>
    </div>
  );
}
