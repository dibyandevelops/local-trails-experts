import OrganizationAvatar from './organization-avatar';
import type { OrganizationDetail } from './hooks/use-organization-detail';

export default function OrganizationProfileHeader({
  organization,
}: {
  organization: OrganizationDetail;
}) {
  return (
    <header className="rounded-xl border border-emerald-200/70 bg-white p-5 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <OrganizationAvatar
          name={organization.name}
          logoUrl={organization.logo_url}
          sizeClassName="h-20 w-20 sm:h-24 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-green-800 dark:text-green-200 sm:text-3xl">
              {organization.name}
            </h1>
            {organization.is_verified && (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                Verified
              </span>
            )}
          </div>
          {organization.tagline && (
            <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
              {organization.tagline}
            </p>
          )}
          {organization.description && (
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
              {organization.description}
            </p>
          )}
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {organization.city || 'Kathmandu'}
              {organization.country ? `, ${organization.country}` : ''}
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {organization.trail_count || 0} trails
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {organization.member_count || 0} team
            </span>
            {organization.website_url && (
              <a
                href={organization.website_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
