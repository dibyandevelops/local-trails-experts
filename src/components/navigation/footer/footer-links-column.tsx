import Link from 'next/link';

type LinkItem = {
  label: string;
  href: string;
};

type Props = {
  title: string;
  items: LinkItem[];
};

export default function FooterLinksColumn({ title, items }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={`${title}-${item.href}-${item.label}`}>
            <Link className="hover:underline" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

