import Link from 'next/link';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { purposeCopy } from '@/i18n/purpose';

function Badge({
  children,
  tone = 'emerald',
}: {
  children: React.ReactNode;
  tone?: 'emerald' | 'amber' | 'sky' | 'slate';
}) {
  const styles =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100'
      : tone === 'sky'
      ? 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100'
      : tone === 'slate'
      ? 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      <div className="text-sm leading-6 text-gray-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-slate-200">
      {items.map((item) => (
        <p key={item}>• {item}</p>
      ))}
    </div>
  );
}

const badgeTones = ['emerald', 'amber', 'sky', 'slate'] as const;

export default function PurposeContent({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const copy = purposeCopy[locale];

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-10 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950 dark:via-slate-950 dark:to-emerald-900/30 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-700/25" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/20" />

        <div className="relative max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {copy.badges.map((badge, index) => (
              <Badge key={badge} tone={badgeTones[index] || 'emerald'}>
                {badge}
              </Badge>
            ))}
          </div>

          <h1 className="text-balance text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100 md:text-5xl">
            {copy.heroTitle}
          </h1>
          {copy.heroBody.map((paragraph, index) => (
            <p
              key={paragraph}
              className={
                index === 0
                  ? 'mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300'
                  : 'mt-3 text-sm text-gray-600 dark:text-gray-300'
              }
            >
              {paragraph}
            </p>
          ))}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/trails"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-green-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 md:text-base"
            >
              {copy.primaryCta}
            </Link>
            <Link
              href="/ride-with-experts"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-green-700 px-7 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30 md:text-base"
            >
              {copy.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {copy.cards.map((card, index) => (
          <Card
            key={card.title}
            title={card.title}
            icon={
              index === 0 ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M5 17c3-2 5-2 8 0s5 2 6 1V6c-1 1-3 1-6-1S8 3 5 5v12Z" fill="currentColor" opacity="0.9" />
                </svg>
              ) : index === 1 ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 2a8 8 0 0 1 8 8c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 0 1 8-8Zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 2c3.5 4.1 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 2.5-6.9 6-11Z" fill="currentColor" />
                </svg>
              )
            }
          >
            {card.body}
          </Card>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {copy.implementedTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            {copy.implementedDescription}
          </p>
          <CheckList items={copy.implementedItems} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {copy.scopedTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            {copy.scopedDescription}
          </p>
          <CheckList items={copy.scopedItems} />
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/60 dark:via-slate-950/70 dark:to-emerald-900/40 md:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            {copy.shortEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {copy.shortTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
            {copy.shortBody}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ride-notes"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-green-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800"
            >
              {copy.rideNotesCta}
            </Link>
            <Link
              href="/support-locoxperts"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-green-700 px-6 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50 dark:border-green-500 dark:text-green-200 dark:hover:bg-green-900/30"
            >
              {copy.supportCta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
