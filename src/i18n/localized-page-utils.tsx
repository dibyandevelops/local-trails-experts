import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocalizedInfoPage from '@/components/i18n/localized-info-page';
import { isLocale, type Locale } from '@/i18n/config';
import { infoPageCopy } from '@/i18n/info-pages';

type PageKey = keyof typeof infoPageCopy;
type PageProps = { params: Promise<{ locale: string }> };

export async function getLocalizedInfoMetadata(pageKey: PageKey, params: PageProps['params']): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  const copy = infoPageCopy[pageKey][locale];
  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    alternates: {
      canonical: `/${locale}/${pageKey}`,
      languages: {
        en: `/${pageKey}`,
        ne: `/ne/${pageKey}`,
      },
    },
  };
}

export async function renderLocalizedInfoPage(pageKey: PageKey, params: PageProps['params']) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  return <LocalizedInfoPage pageKey={pageKey} locale={locale as Locale} />;
}
