import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomePage } from '@/app/home/page';
import { absoluteUrl, DEFAULT_OG_IMAGE_PATH, SITE_NAME } from '@/lib/seo';
import { getLocale, isLocale, type Locale } from '@/i18n/config';
import { homeCopy } from '@/i18n/home';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale) || rawLocale === 'en') notFound();
  const locale = getLocale(rawLocale);
  const copy = homeCopy[locale];

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    alternates: {
      canonical: `/${locale}/home`,
      languages: {
        en: '/home',
        ne: '/ne/home',
      },
    },
    openGraph: {
      title: copy.metadata.title,
      description: copy.metadata.description,
      url: `/${locale}/home`,
      type: 'website',
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export default async function LocalizedHomePage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale) || rawLocale === 'en') notFound();
  return <HomePage locale={rawLocale as Locale} />;
}
