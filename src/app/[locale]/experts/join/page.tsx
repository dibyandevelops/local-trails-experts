import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuideJoinPage } from '@/app/experts/join/page';
import { isLocale, type Locale } from '@/i18n/config';
import { guideJoinCopy } from '@/i18n/guide-join';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  const copy = guideJoinCopy[locale];

  return {
    title: copy.hero.title,
    description: copy.hero.description,
    alternates: {
      canonical: `/${locale}/experts/join`,
      languages: {
        en: '/experts/join',
        ne: '/ne/experts/join',
      },
    },
  };
}

export default async function LocalizedGuideJoinPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  return <GuideJoinPage locale={locale as Locale} />;
}
