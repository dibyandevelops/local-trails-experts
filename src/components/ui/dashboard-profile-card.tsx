import type { ReactNode } from 'react';

export type DashboardProfileInfoItem = {
  label: string;
  value?: ReactNode;
};

type DashboardProfileCardProps = {
  eyebrow?: ReactNode;
  avatarUrl?: string | null;
  avatarAlt: string;
  avatarFallback: ReactNode;
  avatarClassName?: string;
  avatarImageClassName?: string;
  title: ReactNode;
  badges?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  emptyDescription?: ReactNode;
  actions?: ReactNode;
  notice?: ReactNode;
  infoItems?: DashboardProfileInfoItem[];
  children?: ReactNode;
  footerActions?: ReactNode;
  className?: string;
};

export default function DashboardProfileCard({
  eyebrow,
  avatarUrl,
  avatarAlt,
  avatarFallback,
  avatarClassName = 'h-20 w-20 rounded-3xl',
  avatarImageClassName = 'object-cover',
  title,
  badges,
  subtitle,
  description,
  emptyDescription,
  actions,
  notice,
  infoItems = [],
  children,
  footerActions,
  className = '',
}: DashboardProfileCardProps) {
  const hasBody = notice || infoItems.length > 0 || children || footerActions;

  return (
    <section className={`overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="border-b border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className={`${avatarClassName} shrink-0 overflow-hidden border border-emerald-200 bg-emerald-100 dark:border-slate-700 dark:bg-slate-800`}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={avatarAlt} className={`h-full w-full ${avatarImageClassName}`} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xl font-black text-emerald-900 dark:text-emerald-100">
                  {avatarFallback}
                </div>
              )}
            </div>
            <div className="min-w-0">
              {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-gray-950 dark:text-white">{title}</h2>
                {badges}
              </div>
              {subtitle ? <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{subtitle}</p> : null}
              {(description || emptyDescription) ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-700 dark:text-slate-200">
                  {description || emptyDescription}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>

      {hasBody ? (
        <div className="p-5 md:p-6">
          {notice}
          {infoItems.length > 0 ? (
            <dl className="grid gap-3 md:grid-cols-3">
              {infoItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{item.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">{item.value || 'Not set'}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {children}
          {footerActions ? (
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-slate-800">
              {footerActions}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
