import Link from 'next/link';
import OrganizationAvatar from '@/components/feature-components/organizations/organization-avatar';
import { getPublicOrganizations } from '@/lib/data/public-organizations';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const organizations = await getPublicOrganizations();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-green-800 dark:text-green-200">
          Trail Organizations
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          Explore organizations building, verifying, and maintaining trails in Nepal.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {organizations.map((org) => (
          <article
            key={org.id}
            className="rounded-2xl border border-emerald-200/70 bg-white p-5 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70"
          >
            <div className="flex items-start gap-3">
              <OrganizationAvatar
                name={org.name}
                logoUrl={org.logo_url}
                sizeClassName="h-14 w-14"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {org.name}
                  </h2>
                  {org.is_verified && (
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                      Verified
                    </span>
                  )}
                </div>
                {org.tagline && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{org.tagline}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Trails: {org.trail_count}
              </span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Team: {org.member_count}
              </span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {org.city || 'Kathmandu'}{org.country ? `, ${org.country}` : ''}
              </span>
            </div>
            <div className="mt-4">
              <Link
                href={`/organizations/${org.slug}`}
                className="inline-flex rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
              >
                View organization
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
