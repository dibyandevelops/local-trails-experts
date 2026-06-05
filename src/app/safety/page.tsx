import type { Metadata } from 'next';
import {
  InfoCard,
  InfoCardTitle,
  InfoList,
  InfoPageHero,
  InfoPageShell,
  InfoText,
} from '@/components/ui/info-page';

export const metadata: Metadata = {
  title: 'Safety Policy',
  description:
    'How LocoXperts approaches safety, risk management, and what participants and experts should expect on outdoor activities.',
  alternates: { canonical: '/safety' },
};

const participantResponsibilities = [
  'Bring sport-appropriate gear, including a helmet for cycling when required.',
  'Carry enough water, food, layers, lights, and personal essentials for the route and conditions.',
  'Arrive on time so the group is not pushed into unsafe decisions.',
  'Share relevant medical concerns, injuries, allergies, or limitations with the host before starting.',
  'Stop and communicate if you feel unwell, unsafe, separated, or unsure about the route.',
];

const hostResponsibilities = [
  'Communicate meeting point, timing, route expectations, difficulty, and required gear clearly.',
  'Adapt the route when weather, access, visibility, trail conditions, or group readiness changes.',
  'Keep group size and pace manageable for the activity.',
  'Encourage safe spacing, regrouping, signaling, and respectful trail behavior.',
  'Have a basic incident plan, including exit points and how to contact local help.',
];

export default function SafetyPolicyPage() {
  return (
    <InfoPageShell>
      <InfoPageHero
        eyebrow="Safety"
        title="Good trail days start with clear expectations."
        description="Outdoor sports have real risk. LocoXperts reduces avoidable risk by making route context, host expectations, participant responsibilities, and safety reporting easier to understand."
        updated="March 23, 2026"
        actions={[
          { label: 'Browse trails', href: '/trails' },
          { label: 'Read terms', href: '/terms', variant: 'secondary' },
        ]}
      />

      <InfoCard>
        <InfoCardTitle>Core principles</InfoCardTitle>
        <InfoList
          items={[
            'Safety first: pace, route, and decisions should prioritize the group.',
            'Honesty: accurate fitness and experience prevents avoidable incidents.',
            'Preparation: gear, water, timing, and route planning matter.',
            'Respect: follow local rules, local communities, and Leave No Trace basics.',
          ]}
        />
      </InfoCard>

      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard>
          <InfoCardTitle>Participant responsibilities</InfoCardTitle>
          <InfoList items={participantResponsibilities} />
        </InfoCard>

        <InfoCard>
          <InfoCardTitle>Expert and host responsibilities</InfoCardTitle>
          <InfoList items={hostResponsibilities} />
        </InfoCard>
      </div>

      <InfoCard>
        <InfoCardTitle>Weather, route changes, and cancellations</InfoCardTitle>
        <div className="mt-3">
          <InfoText>
            Conditions can change quickly. A host or platform admin may reschedule, shorten, reroute,
            or cancel an activity if storms, low visibility, landslide or flood risk, extreme
            temperature, access restrictions, or group readiness creates avoidable risk.
          </InfoText>
        </div>
      </InfoCard>

      <InfoCard>
        <InfoCardTitle>Medical, emergencies, and insurance</InfoCardTitle>
        <InfoList
          items={[
            'Participants are responsible for their own health decisions.',
            'Carry identification and an emergency contact when possible.',
            'Use local emergency services first for urgent incidents.',
            'Report relevant incidents to the host and LocoXperts so safety guidance can improve.',
            'Appropriate outdoor activity insurance is strongly recommended.',
          ]}
        />
      </InfoCard>
    </InfoPageShell>
  );
}
