import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Safety Policy',
  description:
    'How LocoXperts approaches safety, risk management, and what participants and experts should expect on outdoor activities.',
  alternates: { canonical: '/safety' },
};

export default function SafetyPolicyPage() {
  const updated = 'March 23, 2026';
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Safety Policy
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          Last updated: {updated}
        </p>
        <p className="mt-4 text-sm text-gray-700 dark:text-slate-200">
          Outdoor sports have real risk. Our goal is to reduce avoidable risk by
          setting clear expectations for experts (hosts) and participants
          before, during, and after an activity.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Core Principles
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-slate-200">
          <li>Safety first: pace, route, and decisions prioritize the group.</li>
          <li>Honesty: accurate fitness and experience prevents incidents.</li>
          <li>Preparation: the right gear and planning beats “luck”.</li>
          <li>
            Respect: follow local rules, communities, and Leave No Trace basics.
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Participant Responsibilities
        </h2>
        <div className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
          <p>
            If you join an activity, you agree to follow the expert’s safety
            instructions and to come prepared.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Bring required gear for the sport (helmet for cycling when
              required, proper footwear for hiking/runs, lights for early starts
              if applicable).
            </li>
            <li>Carry enough water/food for the duration and conditions.</li>
            <li>
              Arrive on time; late arrivals can pressure the group into unsafe
              decisions.
            </li>
            <li>
              Share critical information privately with the expert (medical
              concerns, injuries, allergies) before the start.
            </li>
            <li>
              Stop and communicate if you feel unwell, unsafe, or lost—don’t
              “push through” silently.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Expert (Host) Responsibilities
        </h2>
        <div className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
          <p>
            Experts are expected to set a safe plan and run the activity with
            care and clarity.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Communicate meeting point, start time, route expectations, and
              required gear clearly.
            </li>
            <li>
              Adapt to conditions: weather, trail closures, visibility, or
              group readiness may require a route change.
            </li>
            <li>
              Keep groups to a manageable size and set a pace that reduces
              risk.
            </li>
            <li>
              Encourage safe behavior (spacing, signaling, no reckless riding,
              and regrouping).
            </li>
            <li>
              Have a basic plan for incidents (who stays with an injured person,
              how to contact local help, and how to exit the route).
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Weather, Route Changes, and Cancellations
        </h2>
        <p className="text-sm text-gray-700 dark:text-slate-200">
          Conditions can change quickly. The expert or platform may reschedule,
          shorten, or cancel an activity if conditions are unsafe (storms, low
          visibility, flood/landslide risk, extreme heat/cold, or access
          restrictions).
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Medical, Emergencies, and Insurance
        </h2>
        <div className="space-y-3 text-sm text-gray-700 dark:text-slate-200">
          <p>
            Participants are responsible for their own health decisions. We
            strongly recommend appropriate insurance for outdoor activities.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Carry identification and an emergency contact if possible.</li>
            <li>
              In an emergency, follow local guidance and use local emergency
              numbers for the region you’re in.
            </li>
            <li>
              Report incidents to the expert and (when relevant) to LocoXperts
              so we can improve safety guidance.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Reporting Safety Concerns
        </h2>
        <p className="text-sm text-gray-700 dark:text-slate-200">
          If you notice unsafe behavior, route hazards, or an incident during
          an activity, report it as soon as possible. For urgent issues, contact
          local emergency services first.
        </p>
      </section>
    </div>
  );
}

