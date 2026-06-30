'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALE_LABELS, LOCALES, getLocale, isLocale, localizePath, type Locale } from '@/i18n/config';

type LanguageSwitcherProps = {
  locale?: Locale;
  className?: string;
  floating?: boolean;
};

export default function LanguageSwitcher({
  locale,
  className = '',
  floating = false,
}: LanguageSwitcherProps) {
  const pathname = usePathname() || '/';
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const activeLocale = locale || getLocale(isLocale(firstSegment) ? firstSegment : undefined);

  return (
    <nav
      aria-label="Language"
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/85 p-1 text-xs font-bold shadow-sm backdrop-blur dark:border-emerald-900/60 dark:bg-slate-950/80 ${
        floating ? 'fixed bottom-16 right-4 z-40 sm:bottom-[4.25rem] sm:right-5' : ''
      } ${className}`}
    >
      {LOCALES.map((item) => {
        const active = item === activeLocale;
        return (
          <Link
            key={item}
            href={localizePath(pathname, item)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? 'bg-emerald-700 text-white dark:bg-lime-300 dark:text-emerald-950'
                : 'text-emerald-800 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/60'
            }`}
          >
            {LOCALE_LABELS[item]}
          </Link>
        );
      })}
    </nav>
  );
}
