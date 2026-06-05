import { STRAVA_ENABLED } from '@/lib/feature-flags';
import AccountDeletionRequestCta from '@/components/account/account-deletion-request-cta';
import {
  InfoCard,
  InfoCardTitle,
  InfoList,
  InfoPageHero,
  InfoPageShell,
  InfoText,
} from '@/components/ui/info-page';

export default function PrivacyPolicyPage() {
  return (
    <InfoPageShell>
      <InfoPageHero
        eyebrow="Privacy"
        title="Your data should be useful, limited, and protected."
        description="LocoXperts collects only the information needed to run accounts, trail requests, events, expert workflows, and community support. We do not sell personal data."
        updated="March 12, 2026"
        actions={[
          { label: 'Request account deletion', href: '#account-deletion' },
          { label: 'Read terms', href: '/terms', variant: 'secondary' },
        ]}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard>
          <InfoCardTitle>What we collect</InfoCardTitle>
          <InfoList
            items={[
              'Account details such as name, email, phone, role, and profile information.',
              'Trail, event, booking, campaign, and request activity needed to operate the platform.',
              'Uploaded content such as profile details, trail images, payment proof, or organization information.',
            ]}
          />
        </InfoCard>

        <InfoCard>
          <InfoCardTitle>How we use it</InfoCardTitle>
          <InfoList
            items={[
              'To help participants discover trails, join events, and request ride support.',
              'To let experts and organizations manage relevant operations.',
              'To review safety, moderation, verification, payment, and compliance requests.',
            ]}
          />
        </InfoCard>
      </div>

      <InfoCard>
        <InfoCardTitle>Data sharing</InfoCardTitle>
        <div className="mt-3 space-y-3">
          <InfoText>
            We do not sell personal data. We only share information when needed to deliver a feature,
            comply with legal or safety obligations, process platform operations, or communicate between
            participants, experts, organizers, and administrators.
          </InfoText>
          <InfoText>
            The platform currently focuses on Nepal trail communities. If the region or data practices
            materially change, this policy should be updated before that expansion.
          </InfoText>
        </div>
      </InfoCard>

      {STRAVA_ENABLED && (
        <InfoCard>
          <InfoCardTitle>Strava connection</InfoCardTitle>
          <div className="mt-3 space-y-3">
            <InfoText>
              If you connect Strava, LocoXperts accesses Strava data only with your permission and only
              for features inside this platform. You can disconnect Strava from your profile.
            </InfoText>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              This product is not affiliated with or sponsored by Strava. Powered by Strava.
            </p>
          </div>
        </InfoCard>
      )}

      <InfoCard id="account-deletion" className="scroll-mt-24">
        <InfoCardTitle>Account deletion</InfoCardTitle>
        <div className="mt-3 space-y-3">
          <InfoText>
            Account deletion is reviewed manually so active bookings, event obligations, payments,
            moderation records, and safety concerns are handled correctly before completion.
          </InfoText>
          <InfoList
            items={[
              'Submit the deletion request with an optional reason.',
              'We review pending obligations and compliance requirements.',
              'You receive email updates when the request is approved, rejected, or completed.',
            ]}
          />
          <AccountDeletionRequestCta />
        </div>
      </InfoCard>

      <InfoCard>
        <InfoCardTitle>Contact</InfoCardTitle>
        <InfoText>
          Questions about privacy can be sent to {process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'the LocoXperts team'}.
        </InfoText>
      </InfoCard>
    </InfoPageShell>
  );
}
