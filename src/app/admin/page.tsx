'use client';

import type { ReactNode } from 'react';
import AdminHeader from '@/components/admin/admin-header';
import ExpertApplicationsPanel from '@/components/admin/expert-applications-panel';
import TrailRequestsPanel from '@/components/admin/trail-requests-panel';
import PendingTrailsPanel from '@/components/admin/pending-trails-panel';
import UsersPanel from '@/components/admin/users-panel';
import HazardousTrailsPanel from '@/components/admin/hazardous-trails-panel';
import StoreRequestsPanel from '@/components/admin/store-requests-panel';
import StoresAdminPanel from '@/components/admin/stores-admin-panel';
import UpcomingEventsPanel from '@/components/admin/upcoming-events-panel';
import OrganizationMembersPanel from '@/components/admin/organization-members-panel';
import OrganizationOpsPanel from '@/components/admin/organization-ops-panel';
import OrganizationsPanel from '@/components/admin/organizations-panel';
import FundraisingCampaignsPanel from '@/components/admin/fundraising-campaigns-panel';
import ImpactStatsPanel from '@/components/admin/impact-stats-panel';

function AdminSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-slate-300">{description}</p>
      </div>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}
export default function AdminPage() {
  return (
    <div className="space-y-8 pb-10">
      <AdminHeader />
      <ImpactStatsPanel />

      <AdminSection
        id="requests"
        eyebrow="Review queue"
        title="Requests"
        description="Review incoming applications, trail help requests, and store submissions."
      >
        <ExpertApplicationsPanel />
        <TrailRequestsPanel />
        <StoreRequestsPanel />
      </AdminSection>

      <AdminSection
        id="operations"
        eyebrow="Operations area"
        title="Operations"
        description="Manage events, trails, stores, trail builders, and fundraising work."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <StoresAdminPanel />
          <UpcomingEventsPanel />
        </div>
        <OrganizationMembersPanel />
        <OrganizationsPanel />
        <FundraisingCampaignsPanel />
        <OrganizationOpsPanel />
        <HazardousTrailsPanel />
        <PendingTrailsPanel />
      </AdminSection>

      <AdminSection
        id="accounts"
        eyebrow="Admin control"
        title="Accounts"
        description="Manage experts, visibility, and participant records."
      >
        <UsersPanel
          role="expert"
          title="Experts"
          description="Manage expert accounts, hide profiles from the experts page, and remove users if needed."
        />
        <UsersPanel
          role="participant"
          title="Participants"
          description="Review participant accounts and delete when necessary."
        />
      </AdminSection>
    </div>
  );
}
