import Link from 'next/link';

type LinkItem = {
  label: string;
  href?: string;
  badge?: string;
};

type Props = {
  title: string;
  items: LinkItem[];
};

export default function FooterLinksColumn({ title, items }: Props) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={`${title}-${item.href ?? 'static'}-${item.label}`}>
            {item.href ? (
              <Link className="hover:underline" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                {item.label}
                {item.badge && (
                  <span className="rounded-full border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                    {item.badge}
                  </span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
