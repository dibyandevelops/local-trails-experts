import Link from 'next/link';

type InfoPageShellProps = {
  children: React.ReactNode;
  maxWidth?: '3xl' | '4xl' | '5xl';
};

const maxWidthClass = {
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export function InfoPageShell({ children, maxWidth = '4xl' }: InfoPageShellProps) {
  return (
    <div className={`mx-auto ${maxWidthClass[maxWidth]} space-y-5 pb-6`}>
      {children}
    </div>
  );
}

type InfoPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  updated?: string;
  actions?: Array<{ label: string; href: string; variant?: 'primary' | 'secondary' }>;
};

export function InfoPageHero({ eyebrow, title, description, updated, actions = [] }: InfoPageHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-6 py-8 shadow-sm dark:border-emerald-900/70 dark:from-slate-950 dark:via-emerald-950/40 dark:to-lime-950/20 md:px-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-200/45 blur-3xl dark:bg-emerald-500/15" />
      <div className="relative max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-balance text-3xl font-black text-gray-950 dark:text-white md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-slate-300 md:text-base">
          {description}
        </p>
        {updated && (
          <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-slate-400">
            Last updated: {updated}
          </p>
        )}
        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.variant === 'secondary'
                    ? 'inline-flex min-h-10 items-center rounded-full border border-emerald-300 bg-white/70 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-950/50 dark:text-emerald-100 dark:hover:bg-emerald-950/50'
                    : 'inline-flex min-h-10 items-center rounded-full bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 dark:bg-lime-300/20 dark:text-lime-50 dark:ring-1 dark:ring-lime-300/30 dark:hover:bg-lime-300/30'
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

type InfoCardProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
};

export function InfoCard({
  children,
  className = '',
  ...props
}: InfoCardProps) {
  return (
    <section
      {...props}
      className={`rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 ${className}`}
    >
      {children}
    </section>
  );
}

export function InfoCardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black text-gray-950 dark:text-white">
      {children}
    </h2>
  );
}

export function InfoText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-7 text-gray-700 dark:text-slate-300">
      {children}
    </p>
  );
}

export function InfoList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm leading-7 text-gray-700 dark:text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InfoLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-bold text-emerald-700 hover:underline dark:text-emerald-200">
      {children}
    </Link>
  );
}
