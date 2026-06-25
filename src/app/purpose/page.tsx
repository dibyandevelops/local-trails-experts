import type { Metadata } from 'next';
import PurposeContent from '@/components/i18n/purpose-content';
import { purposeCopy } from '@/i18n/purpose';

const defaultCopy = purposeCopy.en;

export const metadata: Metadata = {
  title: defaultCopy.metadata.title,
  description: defaultCopy.metadata.description,
  alternates: {
    canonical: '/purpose',
    languages: {
      en: '/purpose',
      ne: '/ne/purpose',
    },
  },
  keywords: [
    'Kathmandu MTB trails',
    'Nepal trail platform',
    'ride with experts Nepal',
    'local MTB guides Nepal',
    'trail organizations Nepal',
    'bike services Kathmandu',
    'trail campaigns Nepal',
  ],
  openGraph: {
    title: defaultCopy.metadata.title,
    description: defaultCopy.metadata.description,
    url: '/purpose',
    type: 'website',
  },
};

export default async function PurposePage() {
  return <PurposeContent locale="en" />;
}
