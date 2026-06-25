import Link from 'next/link';
import {
  InfoCard,
  InfoCardTitle,
  InfoList,
  InfoPageHero,
  InfoPageShell,
  InfoText,
} from '@/components/ui/info-page';
import type { Locale } from '@/i18n/config';
import { infoPageCopy } from '@/i18n/info-pages';

type LocalizedInfoPageProps = {
  pageKey: keyof typeof infoPageCopy;
  locale: Locale;
};

export default function LocalizedInfoPage({ pageKey, locale }: LocalizedInfoPageProps) {
  const copy = infoPageCopy[pageKey]?.[locale];
  if (!copy) return null;

  if (pageKey === 'support-locoxperts') {
    return <LocalizedSupportPage locale={locale} />;
  }

  return (
    <InfoPageShell maxWidth={pageKey === 'faq' ? '5xl' : '4xl'}>
      <InfoPageHero {...copy.hero} />
      <div className={pageKey === 'faq' ? 'grid gap-5 lg:grid-cols-2' : 'grid gap-5 md:grid-cols-2'}>
        {copy.sections.map((section) => (
          <InfoCard key={section.title}>
            <InfoCardTitle>{section.title}</InfoCardTitle>
            {section.body && (
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <InfoText key={paragraph}>{paragraph}</InfoText>
                ))}
              </div>
            )}
            {section.items && <InfoList items={section.items} />}
          </InfoCard>
        ))}
      </div>
    </InfoPageShell>
  );
}

function LocalizedSupportPage({ locale }: { locale: Locale }) {
  const copy = infoPageCopy['support-locoxperts'][locale];
  const scan = copy.sections[0];
  const support = copy.sections[1];

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <InfoPageHero {...copy.hero} />
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section id="platform-support" className="scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <h2 className="text-lg font-black text-gray-950 dark:text-white">{scan.title}</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700">
            <div className="aspect-square overflow-hidden rounded-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/donate/esewa-platform-support.jpeg"
                alt="eSewa QR code for supporting LocoXperts platform upkeep"
                className="h-full w-full object-cover object-[50%_23%]"
              />
            </div>
          </div>
          {scan.body?.[0] && (
            <p className="mt-3 text-center text-xs font-semibold text-gray-500 dark:text-slate-400">
              {scan.body[0]}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 lg:mt-8">
          <h2 className="text-lg font-black text-gray-950 dark:text-white">{support.title}</h2>
          <div className="mt-3 space-y-3">
            {support.body?.map((paragraph, index) => (
              <p
                key={paragraph}
                className={
                  index === 1
                    ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
                    : 'text-sm leading-7 text-gray-700 dark:text-slate-300'
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
          <Link
            href="/campaigns"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300 bg-white px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100 dark:hover:bg-emerald-950/30"
          >
            {locale === 'ne' ? 'ट्रेल अभियान हेर्नुहोस्' : 'View trail campaigns'}
          </Link>
        </section>
      </div>
    </div>
  );
}
