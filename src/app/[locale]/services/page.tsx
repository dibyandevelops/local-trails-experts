import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ServicesDirectory from '@/components/services/services-directory';
import { isLocale } from '@/i18n/config';
import { servicesCopy } from '@/i18n/services';
import { getCommunityWhatsappLink } from '@/lib/whatsapp';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  const copy = servicesCopy[locale];
  return {
    ...copy.metadata,
    alternates: {
      canonical: `/${locale}/services`,
      languages: { en: '/services', ne: '/ne/services' },
    },
  };
}

export default async function LocalizedServicesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  const businessContactHref = getCommunityWhatsappLink(servicesCopy[locale].business.whatsappMessage);
  return <ServicesDirectory locale={locale} businessContactHref={businessContactHref} />;
}
