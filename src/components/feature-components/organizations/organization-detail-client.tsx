'use client';

import Link from 'next/link';
import OrganizationCampaignsSection from './organization-campaigns-section';
import OrganizationGallerySection from './organization-gallery-section';
import OrganizationMembersSection from './organization-members-section';
import OrganizationProfileHeader from './organization-profile-header';
import OrganizationTrailsSection from './organization-trails-section';
import OrganizationUpdatesSection from './organization-updates-section';
import OrganizationServicesSection from './organization-services-section';
import { useOrganizationDetail } from './hooks/use-organization-detail';

export default function OrganizationDetailClient({ slug }: { slug: string }) {
  const { data, isLoading, error } = useOrganizationDetail(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-800" />
        <div className="mt-4 h-52 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-800" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-800" />
          <div className="h-44 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link
          href="/organizations"
          className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to organizations
        </Link>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Trail builder not found
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            This trail builder may be hidden or no longer available.
          </p>
        </div>
      </div>
    );
  }

  const hasSidebar = data.members.length > 0 || data.campaigns.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/organizations"
        className="inline-flex rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Back to organizations
      </Link>
      <div className="mt-4">
        <OrganizationProfileHeader organization={data.organization} />
      </div>
      <div
        className={
          hasSidebar
            ? 'mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]'
            : 'mt-6'
        }
      >
        <div className="space-y-6">
          <OrganizationTrailsSection trails={data.trails} />
          <OrganizationUpdatesSection updates={data.updates} />
          <OrganizationServicesSection services={data.services || []} />
          <OrganizationGallerySection
            items={data.galleryItems}
            organizationName={data.organization.name}
          />
        </div>
        {hasSidebar && (
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <OrganizationMembersSection members={data.members} />
            <OrganizationCampaignsSection campaigns={data.campaigns} />
          </aside>
        )}
      </div>
    </div>
  );
}
