import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';

type PageProps = { params: Promise<{ locale: string }> };

export default async function LocalizedDonateRedirectPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'en') notFound();
  redirect(`/${locale}/support-locoxperts`);
}
