import type { Metadata } from 'next';
import { DEFAULT_DESCRIPTION, SITE_NAME } from '@/lib/seo';

type SearchParams = Record<string, string | string[] | undefined>;

export function hasAnySearchParams(searchParams: SearchParams | undefined) {
  if (!searchParams) return false;
  for (const value of Object.values(searchParams)) {
    if (Array.isArray(value)) {
      if (value.some((v) => String(v || '').trim().length > 0)) return true;
    } else if (String(value || '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

export function listingMetadata(opts: {
  title: string;
  description?: string;
  canonicalPath: string;
  hasFilters: boolean;
  keywords?: string[];
}): Metadata {
  const description = opts.description || DEFAULT_DESCRIPTION;
  const keywords = opts.keywords || [
    'MTB trails Nepal',
    'mountain bike trails Nepal',
    'Nepal trail map',
    'cycling routes Nepal',
    'local trail experts Nepal',
    'LocoXperts',
  ];
  return {
    title: opts.title,
    description,
    keywords,
    alternates: { canonical: opts.canonicalPath },
    robots: opts.hasFilters
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: opts.title,
      description,
      url: opts.canonicalPath,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: opts.title,
      description,
    },
  };
}

export function resolveHasFilters(searchParams?: SearchParams) {
  return hasAnySearchParams(searchParams);
}
