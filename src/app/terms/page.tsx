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
  title: 'Terms & Conditions',
  description:
    'Terms and conditions for using LocoXperts, including safety, content, and expert/community guidelines.',
  alternates: { canonical: '/terms' },
};

const sections = [
  {
    title: 'Platform role',
    body:
      'LocoXperts helps people discover trails, connect with local experts, and join outdoor events. Experts and organizers are independent hosts unless explicitly stated otherwise.',
  },
  {
    title: 'Safety and risk',
    body:
      'Outdoor activities can involve injury, illness, route uncertainty, weather, traffic, wildlife, and equipment failure. You are responsible for your own safety decisions and preparedness.',
  },
  {
    title: 'Accounts and verification',
    body:
      'You agree to provide accurate information. Verified status means the platform has reviewed certain details; it is not a guarantee of safety, outcome, or service quality.',
  },
  {
    title: 'Trail and content accuracy',
    body:
      'Trail data, maps, distance, elevation, difficulty labels, meeting points, and service details are provided as-is and can change. Verify locally before relying on a route.',
  },
  {
    title: 'Events and payments',
    body:
      'Event pricing is set by hosts or admins where applicable. Payment and QR flows may use third-party services and may change as platform workflows mature.',
  },
  {
    title: 'Availability and changes',
    body:
      'Features, policies, and these terms may change. We may suspend content or accounts that create legal, safety, trust, or abuse risk.',
  },
];

export default function TermsPage() {
  return (
    <InfoPageShell>
      <InfoPageHero
        eyebrow="Legal"
        title="Terms for using LocoXperts"
        description="These terms explain how the platform works, what users are responsible for, and how we handle safety, content, events, payments, and account behavior."
        updated="March 24, 2026"
        actions={[
          { label: 'Read safety policy', href: '/safety' },
          { label: 'Read privacy policy', href: '/privacy', variant: 'secondary' },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <InfoCard key={section.title}>
            <InfoCardTitle>{section.title}</InfoCardTitle>
            <div className="mt-3">
              <InfoText>{section.body}</InfoText>
            </div>
          </InfoCard>
        ))}
      </div>

      <InfoCard>
        <InfoCardTitle>Prohibited use</InfoCardTitle>
        <InfoList
          items={[
            'Do not misuse the platform to harm others, impersonate people, or spam.',
            'Do not upload illegal, hateful, misleading, unsafe, or infringing content.',
            'Do not attempt to disrupt the platform or access data you are not authorized to see.',
          ]}
        />
      </InfoCard>

      <InfoCard>
        <InfoCardTitle>Privacy and contact</InfoCardTitle>
        <div className="mt-3 space-y-3">
          <InfoText>
            Please review the <InfoLink href="/privacy">Privacy Policy</InfoLink> to understand
            how user data is handled.
          </InfoText>
          <InfoText>
            For questions about these terms, contact the LocoXperts team through the footer support
            options or the feedback flow.
          </InfoText>
        </div>
      </InfoCard>
    </InfoPageShell>
  );
}
