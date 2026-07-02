'use client';

import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/i18n/language-switcher';
import { isLocale, stripLocale } from '@/i18n/config';

const LOCALIZED_PATHS = new Set([
  '/home',
  '/faq',
  '/purpose',
  '/privacy',
  '/terms',
  '/safety',
  '/support-locoxperts',
  '/donate',
  '/experts/join',
]);

export default function LocaleFloatingSwitcher() {
  const pathname = usePathname() || '/';
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const locale = isLocale(firstSegment) ? firstSegment : undefined;
  const basePath = stripLocale(pathname);

  if (!LOCALIZED_PATHS.has(basePath)) return null;

  return <LanguageSwitcher locale={locale} floating />;
}
