import { getLocalizedInfoMetadata, renderLocalizedInfoPage } from '@/i18n/localized-page-utils';

type PageProps = { params: Promise<{ locale: string }> };
const pageKey = 'privacy' as const;

export function generateMetadata({ params }: PageProps) {
  return getLocalizedInfoMetadata(pageKey, params);
}

export default function Page({ params }: PageProps) {
  return renderLocalizedInfoPage(pageKey, params);
}
