import Link from 'next/link';

type Props = {
  contactHref: string;
  featureHref: string;
  onOpenFeedback: () => void;
};

export default function FooterSupportColumn({
  contactHref,
  featureHref,
  onOpenFeedback,
}: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Support & legal</p>
      <ul className="mt-2 space-y-1 text-sm">
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
          <Link className="hover:underline" href="/purpose">
            Purpose
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
    </div>
  );
}
