'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import type { User } from '@/types';
import GroupRequestForm from '@/components/feature-components/group-request-form';
import { COMMUNITY_NAME } from '@/lib/branding';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

function buildMailto(params: { to?: string; subject: string; body: string }) {
  const subject = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `mailto:${params.to}?subject=${subject}&body=${body}`;
}

export default function Footer({ initialUser = null }: { initialUser?: User | null }) {
  const year = new Date().getFullYear();
  const brand = 'LocoXperts';
  const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const communityWhatsappGroupLink =
    process.env.NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_LINK
  const [groupRequestOpen, setGroupRequestOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState(initialUser?.name || '');
  const [feedbackEmail, setFeedbackEmail] = useState(initialUser?.email || '');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackAccepted, setFeedbackAccepted] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

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

  async function onSubmitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackError(null);
    setFeedbackSent(false);
    if (!feedbackAccepted) {
      setFeedbackError('Please accept terms before sending feedback.');
      return;
    }

    setSendingFeedback(true);
    try {
      const response = await fetch('/api/contact/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feedbackName,
          email: feedbackEmail,
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          message: feedbackMessage,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setFeedbackError(data.error || 'Failed to send feedback.');
        return;
      }
      setFeedbackSent(true);
      setFeedbackMessage('');
      setFeedbackAccepted(false);
      setTimeout(() => setFeedbackOpen(false), 900);
    } catch {
      setFeedbackError('Failed to send feedback.');
    } finally {
      setSendingFeedback(false);
    }
  }

  return (
    <footer className="border-t border-gray-200 bg-white/70 py-10 text-gray-700 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
      <div className="container mx-auto grid gap-8 px-4 md:grid-cols-4 md:gap-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {brand}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Nepal Trail Hub: free trail maps, local experts, and community-led rides.
          </p>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
            <li>• Keep Nepal trails mapped and easier to navigate.</li>
            <li>• Fund trail maintenance, signage, and local trail crews.</li>
            <li>• Connect riders with verified local experts.</li>
            <li>• Support local tourism and trail communities.</li>
          </ul>
          <p className="text-xs text-emerald-700 dark:text-emerald-200">
            Built with {COMMUNITY_NAME}.
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            © {year} {brand}. All rights reserved. {brand} are
            trademarks or registered trademarks of their respective owners.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Features
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <Link className="hover:underline" href="/trails">
                Trail map
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/events">
                Browse events
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/community-rides">
                Community rides
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/experts">
                Find experts
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/store-locator">
                Cycle hubs
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/events/trainings/create">
                Organize trainings
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            For experts
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <Link className="hover:underline" href="/experts/join">
                For experts
                {EXPERTS_BETA_ENABLED ? ' (Beta)' : ''}
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/events/create">
                Create events
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/events/trainings/create">
                Organize trainings
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/upload">
                Create trail
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Support & legal
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <a className="hover:underline" href={contactHref}>
                Contact us
              </a>
            </li>
            <li>
              <a className="hover:underline" href={featureHref}>
                Request a feature
              </a>
            </li>
            <li>
              <button
                type="button"
                className="text-left hover:underline"
                onClick={() => {
                  setFeedbackError(null);
                  setFeedbackSent(false);
                  setFeedbackOpen(true);
                }}
              >
                Share platform feedback
              </button>
            </li>
            <li>
              <button
                type="button"
                className="text-left hover:underline"
                onClick={() => setGroupRequestOpen(true)}
              >
                Request a large group ride
              </button>
            </li>
            <li>
              <a
                className="hover:underline"
                href={communityWhatsappGroupLink}
                target="_blank"
                rel="noreferrer"
              >
                Join local trails &amp; experts community
              </a>
            </li>
            <li>
              <Link className="hover:underline" href="/purpose">
                Nepal Trail Hub purpose
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/sponsors">
                Sponsor the trail hub
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/donate">
                Contribute to trail fund
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/privacy">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/terms">
                Terms &amp; conditions
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/safety">
                Safety policy
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/faq">
                FAQ
              </Link>
            </li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Prefer email?{' '}
            <a className="hover:underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
          {EXPERTS_BETA_ENABLED && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Experts features are in beta: workflows may change.
            </p>
          )}
        </div>
      </div>

      <Dialog.Root open={groupRequestOpen} onOpenChange={setGroupRequestOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  Organize a large group
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Send your group details and preferred date — we’ll follow up to help you organize.
                </p>
              </div>
              <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Close
              </Dialog.Close>
            </div>

            <div className="mt-5">
              <GroupRequestForm
                initialUser={initialUser}
                initialTrail={null}
                onSent={() => setGroupRequestOpen(false)}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-950 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  Share feedback
                </Dialog.Title>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  Tell us what works well and what we should improve.
                </p>
              </div>
              <Dialog.Close className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                Close
              </Dialog.Close>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmitFeedback}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Name
                  </label>
                  <input
                    type="text"
                    value={feedbackName}
                    onChange={(event) => setFeedbackName(event.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Email
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(event) => setFeedbackEmail(event.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Feedback
                </label>
                <textarea
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  required
                  minLength={12}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Share your experience, issues, or ideas..."
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={feedbackAccepted}
                  onChange={(event) => setFeedbackAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  required
                />
                <span>I accept terms and consent to share this feedback with the platform team.</span>
              </label>

              {feedbackError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {feedbackError}
                </p>
              )}
              {feedbackSent && (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200">
                  Feedback sent. Thank you.
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={sendingFeedback}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingFeedback ? 'Sending...' : 'Send feedback'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </footer>
  );
}
