import Link from 'next/link';

type Props = {
  contactHref: string;
  featureHref: string;
  socialLinks?: Array<{ label: string; href: string }>;
  onOpenFeedback: () => void;
};

export default function FooterSupportColumn({
  contactHref,
  featureHref,
  socialLinks = [],
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
      {socialLinks.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">
            Social
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {socialLinks.map((item) => (
              <li key={item.href}>
                <a
                  className="hover:underline"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
