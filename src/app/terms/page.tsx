import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms and conditions for using LocoXperts, including safety, content, and expert/community guidelines.',
  alternates: { canonical: '/terms' },
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 text-lg font-bold text-gray-900 dark:text-gray-100">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-8 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
          Legal
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Terms &amp; Conditions
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
          These terms apply to your use of LocoXperts (the “Platform”). If you do
          not agree, please do not use the Platform.
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Last updated: March 24, 2026
        </p>
      </header>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <H2>1. Who We Are</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          LocoXperts helps people discover trails, connect with local experts,
          and join outdoor events. Some content is contributed by the community
          and may be updated over time.
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          The Platform operates as a bulletin board and matching service. Experts
          are independent hosts who set their own pricing and run their own events.
          LocoXperts does not employ experts or provide the activities directly.
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          Current focus area: Nepal. We may expand to additional regions over time.
        </p>

        <H2>2. Safety &amp; Assumption of Risk</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          Outdoor activities (MTB, hiking, trail running, tours, trainings) can
          involve serious risks including injury, illness, lost routes, sudden
          weather changes, traffic, wildlife, and equipment failure. You are
          responsible for your own safety decisions and preparedness.
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          Always follow local laws, carry appropriate safety gear, and avoid
          activities beyond your ability. If you join an event, arrive on time
          and follow host instructions.
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          For additional guidance, see our{' '}
          <Link href="/safety" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200">
            Safety Policy
          </Link>
          .
        </p>

        <H2>3. Accounts, Roles, and Verification</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          The Platform may support different roles (participant, expert, admin).
          “Verified” status (where shown) indicates an admin has reviewed
          certain details, but it is not a guarantee of outcomes or safety.
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          You agree to provide accurate information and to keep your contact
          details current.
        </p>

        <H2>4. Trails &amp; Content Accuracy</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          Trail data, GPX routes, distance/elevation estimates, meeting points,
          and difficulty labels are provided “as is.” Conditions change. Always
          verify locally before riding or hiking a route.
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          If you upload content, you confirm you have the rights to share it and
          you grant the Platform permission to display it to users.
        </p>

        <H2>5. Events, Pricing, and Payments</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          Event pricing (including free events) is set by hosts/admins where
          applicable. Any payment or QR flow is provided for convenience and may
          depend on third-party services. We may update how payments are handled
          as the Platform evolves.
        </p>

        <H2>6. Prohibited Use</H2>
        <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-slate-200">
          <li>• Do not misuse the Platform to harm others, impersonate people, or spam.</li>
          <li>• Do not upload illegal, hateful, or infringing content.</li>
          <li>• Do not attempt to disrupt the Platform or access data you are not authorized to see.</li>
        </ul>

        <H2>7. Availability &amp; Changes</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          We may update features, policies, and these terms from time to time.
          We may suspend or remove content/accounts that violate the terms or
          create safety/legal risk.
        </p>

        <H2>8. Privacy</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          Please review our{' '}
          <Link href="/privacy" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200">
            Privacy Policy
          </Link>{' '}
          to understand how we handle your data.
        </p>

        <H2>9. Contact</H2>
        <p className="mt-2 text-sm text-gray-700 dark:text-slate-200">
          For questions about these terms, contact us via{' '}
          <Link href="/sponsors" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-200">
            Sponsors / collaborate
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
