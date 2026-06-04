'use client';

import { useState } from 'react';
import type { User } from '@/types';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';
import FooterInfoColumn from '@/components/navigation/footer/footer-info-column';
import FooterLinksColumn from '@/components/navigation/footer/footer-links-column';
import FooterSupportColumn from '@/components/navigation/footer/footer-support-column';
import FeedbackModal from '@/components/navigation/footer/feedback-modal';
import CollaborationRequestModal from '@/components/navigation/footer/collaboration-request-modal';

function buildMailto(params: { to?: string; subject: string; body: string }) {
  const subject = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `mailto:${params.to}?subject=${subject}&body=${body}`;
}

const FEATURE_LINKS = [
  { label: 'Trail map', href: '/trails' },
  { label: 'Find experts', href: '/experts' },
  { label: 'Events', href: '/events' },
  { label: 'Trail builders', href: '/organizations' },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'Cycle hubs', href: '/store-locator' },
  { label: 'Shop', badge: 'Coming soon' },
];

const EXPERT_LINKS_BASE = [
  { label: 'Create event', href: '/events/create' },
  { label: 'Create trail', href: '/upload' },
];

export default function Footer({ initialUser = null }: { initialUser?: User | null }) {
  const year = new Date().getFullYear();
  const brand = 'LocoXperts';
  const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const individualWhatsappNumber = '9810265305';
  const individualWhatsappLink = `https://wa.me/977${individualWhatsappNumber}`;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    <footer className="border-t border-gray-200 bg-white/80 py-5 text-gray-700 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
      <div className="container mx-auto grid gap-4 px-4 lg:grid-cols-[1.1fr_1.4fr] lg:items-start">
        <FooterInfoColumn year={year} brand={brand} />
        <div className="grid gap-4 sm:grid-cols-3">
          <FooterLinksColumn title="Explore" items={FEATURE_LINKS} />
          <FooterLinksColumn title="For experts" items={expertLinks} />
          <FooterSupportColumn
            contactHref={contactHref}
            featureHref={featureHref}
            onOpenFeedback={() => setFeedbackOpen(true)}
          />
        </div>
      </div>
      <div className="container mx-auto mt-4 flex flex-col gap-2 border-t border-gray-200 px-4 pt-3 text-xs text-gray-500 dark:border-slate-800 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>Reach out for collaboration, trail mapping, and weekend ride planning.</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={individualWhatsappLink}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setCollaborationRequestOpen(true)}
            className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
          >
            Contribute skills
          </button>
        </div>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        initialUser={initialUser}
      />
      <CollaborationRequestModal
        open={collaborationRequestOpen}
        onOpenChange={setCollaborationRequestOpen}
        initialUser={initialUser}
      />
    </footer>
  );
}
