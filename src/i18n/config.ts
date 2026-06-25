export const LOCALES = ['en', 'ne'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ne: 'नेपाली',
};

export function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function stripLocale(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (isLocale(parts[0])) {
    return `/${parts.slice(1).join('/')}` || '/';
  }
  return pathname || '/';
}

export function localizePath(pathname: string, locale: Locale) {
  const cleanPath = stripLocale(pathname);
  if (locale === DEFAULT_LOCALE) return cleanPath;
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}
