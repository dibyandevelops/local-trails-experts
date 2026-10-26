import type { Metadata } from 'next';
import ServicesDirectory from '@/components/services/services-directory';
import { servicesCopy } from '@/i18n/services';
import { getCommunityWhatsappLink } from '@/lib/whatsapp';

export const metadata: Metadata = servicesCopy.en.metadata;

export default function ServicesPage() {
  const businessContactHref = getCommunityWhatsappLink(servicesCopy.en.business.whatsappMessage);
  return <ServicesDirectory locale="en" businessContactHref={businessContactHref} />;
}
