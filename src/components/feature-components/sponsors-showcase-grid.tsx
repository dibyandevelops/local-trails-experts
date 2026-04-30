'use client';

import { useQuery } from '@tanstack/react-query';

type Sponsor = {
  id: string;
  company_name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'custom';
  logo_url: string | null;
  agenda: string | null;
  website_url: string | null;
};

function tierClass(tier: Sponsor['tier']) {
  if (tier === 'gold') return 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30';
  if (tier === 'silver') return 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40';
  if (tier === 'bronze') return 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30';
  return 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900/40';
}

export default function SponsorsShowcaseGrid() {
  const { data: sponsors = [], isLoading } = useQuery<Sponsor[]>({
    queryKey: ['sponsors-showcase'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/sponsors', { signal, cache: 'no-store' });
      if (!response.ok) return [];
      const data = await response.json().catch(() => ({}));
      return data.sponsors || [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (sponsors.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-slate-300">No sponsors listed yet.</p>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {sponsors.map((sponsor) => (
        <article key={sponsor.id} className={`rounded-2xl border p-5 shadow-sm ${tierClass(sponsor.tier)}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-emerald-300 bg-white/70 text-emerald-800 dark:border-emerald-900/60 dark:bg-slate-950/40 dark:text-emerald-100">
              {sponsor.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sponsor.logo_url} alt={`${sponsor.company_name} logo`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold">LOGO</span>
              )}
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
              {sponsor.tier}
            </span>
          </div>
          <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-100">{sponsor.company_name}</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            {sponsor.agenda || 'Supporting Nepal trail ecosystem initiatives.'}
          </p>
          {sponsor.website_url && (
            <a
              href={sponsor.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
            >
              Visit website
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

