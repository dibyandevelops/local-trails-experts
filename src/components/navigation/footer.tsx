'use client';

import Link from 'next/link';

function buildMailto(params: { to?: string; subject: string; body: string }) {
  const subject = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `mailto:${params.to}?subject=${subject}&body=${body}`;
}

export default function Footer() {
  const year = new Date().getFullYear();
  const brand = 'LocoXperts';
  const contactEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const contactHref = buildMailto({
    to: contactEmail,
    subject: 'LocoXperts — Contact',
    body: `Hi LocoXperts team,\n\n`,
  });

  const marketingHref = buildMailto({
    to: contactEmail,
    subject: 'LocoXperts — Marketing inquiry',
    body: `Hi LocoXperts team,\n\nI'm interested in marketing opportunities.\n\n`,
  });

  const featureHref = buildMailto({
    to: contactEmail,
    subject: 'LocoXperts — Feature request',
    body: `Hi LocoXperts team,\n\nFeature request:\n- \n\nWhy it helps:\n- \n\n`,
  });

  const collaborateHref = buildMailto({
    to: contactEmail,
    subject: 'LocoXperts — Custom events / group collaboration',
    body: `Hi LocoXperts team,\n\nWe’d like to request a custom event for a large group.\n\nDetails:\n- Group size:\n- Dates:\n- City/region:\n- Sport (MTB/hiking/trail running/etc.):\n- Goals (training/tour/team building):\n- Budget range (optional):\n\n`,
  });

  return (
    <footer className="mt-10 border-t border-gray-200 bg-white/70 py-10 text-gray-700 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
      <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3 md:gap-10">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {brand}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Trails, events, and local experts for outdoor sports.
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            © {year} {brand}. All rights reserved. {brand} are
            trademarks or registered trademarks of their respective owners.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Contact
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <a className="hover:underline" href={contactHref}>
                Contact us
              </a>
            </li>
            <li>
              <a className="hover:underline" href={marketingHref}>
                Marketing
              </a>
            </li>
            <li>
              <a className="hover:underline" href={featureHref}>
                Request a feature
              </a>
            </li>
            <li>
              <a className="hover:underline" href={collaborateHref}>
                Custom events / collaborate (big groups)
              </a>
            </li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Prefer email?{' '}
            <a className="hover:underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Project
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <Link className="hover:underline" href="/purpose">
                Purpose
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/trails">
                Explore trails
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/events">
                Browse events
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/experts">
                Find experts
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/sponsors">
                Sponsors
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/donate">
                Donate
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/safety">
                Safety policy
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
          </ul>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Want something like this for your community or destination? Use the
            collaboration link and tell us what you’re building.
          </p>
        </div>
      </div>
    </footer>
  );
}
