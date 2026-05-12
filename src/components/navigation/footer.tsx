'use client';

import { useState } from 'react';
import type { User } from '@/types';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import FooterInfoColumn from '@/components/navigation/footer/footer-info-column';
import FooterLinksColumn from '@/components/navigation/footer/footer-links-column';
import FooterSupportColumn from '@/components/navigation/footer/footer-support-column';
import GroupRequestModal from '@/components/navigation/footer/group-request-modal';
import FeedbackModal from '@/components/navigation/footer/feedback-modal';
import ShuttleFacilitiesModal from '@/components/navigation/footer/shuttle-facilities-modal';
import CollaborationRequestModal from '@/components/navigation/footer/collaboration-request-modal';

function buildMailto(params: { to?: string; subject: string; body: string }) {
  const subject = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `mailto:${params.to}?subject=${subject}&body=${body}`;
}

const FEATURE_LINKS = [
  { label: 'Trail map', href: '/trails' },
  { label: 'Browse events', href: '/events' },
  { label: 'Community rides', href: '/community-rides' },
  { label: 'Find experts', href: '/experts' },
  { label: 'Cycle hubs', href: '/store-locator' },
  { label: 'Organize trainings', href: '/events/trainings/create' },
];

const EXPERT_LINKS_BASE = [
  { label: 'Create events', href: '/events/create' },
  { label: 'Organize trainings', href: '/events/trainings/create' },
  { label: 'Create trail', href: '/upload' },
];

export default function Footer({ initialUser = null }: { initialUser?: User | null }) {
  const year = new Date().getFullYear();
  const brand = 'LocoXperts';
  const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const communityWhatsappGroupLink =
    process.env.NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_LINK ||
    'https://chat.whatsapp.com/BqFfpRR2nc94lf0Un7jlWA';
  const individualName = 'Dibyan Maharjan';
  const individualWhatsappNumber = '9810265305';
  const individualWhatsappLink = `https://wa.me/977${individualWhatsappNumber}`;
  const individualStravaLink = 'https://www.strava.com/athletes/164200038';
  const [groupRequestOpen, setGroupRequestOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shuttleModalOpen, setShuttleModalOpen] = useState(false);
  const [collaborationRequestOpen, setCollaborationRequestOpen] = useState(false);

  const contactHref = buildMailto({
    to: contactEmail,
    subject: 'LocoXperts — Contact',
    body: `Hi LocoXperts team,\n\n`,
  });

  const featureHref = buildMailto({
    to: contactEmail,
    subject: 'LocoXperts — Feature request',
    body: `Hi LocoXperts team,\n\nFeature request:\n- \n\nWhy it helps:\n- \n\n`,
  });

  const expertLinks = [
    {
      label: `For experts${EXPERTS_BETA_ENABLED ? ' (Beta)' : ''}`,
      href: '/experts/join',
    },
    ...EXPERT_LINKS_BASE,
  ];

  return (
    <footer className="border-t border-gray-200 bg-white/70 py-10 text-gray-700 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
      <div className="container mx-auto grid gap-8 px-4 md:grid-cols-4 md:gap-10">
        <FooterInfoColumn year={year} brand={brand} />
        <FooterLinksColumn title="Features" items={FEATURE_LINKS} />
        <FooterLinksColumn title="For experts" items={expertLinks} />
        <FooterSupportColumn
          contactHref={contactHref}
          featureHref={featureHref}
          communityWhatsappGroupLink={communityWhatsappGroupLink}
          contactEmail={contactEmail}
          expertsBetaEnabled={EXPERTS_BETA_ENABLED}
          onOpenFeedback={() => setFeedbackOpen(true)}
          onOpenGroupRequest={() => setGroupRequestOpen(true)}
          onOpenShuttleContacts={() => setShuttleModalOpen(true)}
        />
      </div>
      <div className="container mx-auto px-4">
        <div className="mt-8 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-5 shadow-sm transition hover:shadow-md dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Individual contribution contact
              </p>
              <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                Currently coordinated directly by {individualName}. Reach out for collaboration,
                trail mapping, and weekend ride planning.
              </p>
              <p className="mt-2 text-xs text-emerald-900/90 dark:text-emerald-100/90">
                WhatsApp: {individualWhatsappNumber}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
              <a
                href={individualWhatsappLink}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:w-auto"
              >
                Message on WhatsApp
              </a>
              <a
                href={individualStravaLink}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-full items-center justify-center rounded-full border border-emerald-300 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 md:w-auto"
              >
                View Strava profile
              </a>
            </div>
          </div>
          <div className="mt-3 border-t border-emerald-200/70 pt-3 dark:border-emerald-900/60">
            <button
              type="button"
              onClick={() => setCollaborationRequestOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white/80 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              Looking for collaborators? Contribute your skills
            </button>
          </div>
        </div>
      </div>

      <GroupRequestModal
        open={groupRequestOpen}
        onOpenChange={setGroupRequestOpen}
        initialUser={initialUser}
      />
      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        initialUser={initialUser}
      />
      <ShuttleFacilitiesModal
        open={shuttleModalOpen}
        onOpenChange={setShuttleModalOpen}
      />
      <CollaborationRequestModal
        open={collaborationRequestOpen}
        onOpenChange={setCollaborationRequestOpen}
        initialUser={initialUser}
      />
    </footer>
  );
}
