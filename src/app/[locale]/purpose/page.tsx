import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PurposeContent from '@/components/i18n/purpose-content';
import { isLocale, type Locale } from '@/i18n/config';
import { purposeCopy } from '@/i18n/purpose';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  const copy = purposeCopy[locale];
  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    alternates: {
      canonical: `/${locale}/purpose`,
      languages: {
        en: '/purpose',
        ne: '/ne/purpose',
      },
    },
    openGraph: {
      title: copy.metadata.title,
      description: copy.metadata.description,
      url: `/${locale}/purpose`,
      type: 'website',
    },
  };
}

export default async function LocalizedPurposePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  return <PurposeContent locale={locale as Locale} />;
}
