import type { Metadata } from 'next';
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';

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
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
    },
  };
}

export function resolveHasFilters(searchParams?: SearchParams) {
  return hasAnySearchParams(searchParams);
}
