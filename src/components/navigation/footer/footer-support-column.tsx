import Link from 'next/link';

type Props = {
  contactHref: string;
  featureHref: string;
  communityWhatsappGroupLink?: string;
  contactEmail?: string;
  expertsBetaEnabled: boolean;
  onOpenFeedback: () => void;
  onOpenShuttleContacts: () => void;
};

export default function FooterSupportColumn({
  contactHref,
  featureHref,
  contactEmail,
  expertsBetaEnabled,
  onOpenFeedback,
  onOpenShuttleContacts,
}: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Support & legal</p>
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
          <button type="button" className="text-left hover:underline" onClick={onOpenFeedback}>
            Share platform feedback
          </button>
        </li>
        <li>
          <button type="button" className="text-left hover:underline" onClick={onOpenShuttleContacts}>
            View paid shuttle contacts
          </button>
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
      {expertsBetaEnabled && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Experts features are in beta: workflows may change.
        </p>
      )}
    </div>
  );
}
