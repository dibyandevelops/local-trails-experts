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
import RideProgramsPanel from '@/components/admin/ride-programs-panel';
import RideNotesPanel from '@/components/admin/ride-notes-panel';

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
    <details
      id={id}
      open
      className="group scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-slate-800">
        <span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            {eyebrow}
          </span>
          <span className="mt-1 block text-xl font-semibold text-gray-900 dark:text-white">{title}</span>
          <span className="mt-1 block max-w-3xl text-sm text-gray-600 dark:text-slate-300">{description}</span>
        </span>
        <span className="mt-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition group-open:bg-emerald-50 group-open:text-emerald-800 dark:border-slate-700 dark:text-slate-300 dark:group-open:bg-emerald-950/40 dark:group-open:text-emerald-200">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="mt-5 space-y-6">{children}</div>
    </details>
  );
}

const adminNavItems = [
  {
    href: '#requests',
    label: 'Requests',
    description: 'Applications, rider requests, and shop requests.',
  },
  {
    href: '#content',
    label: 'Content',
    description: 'Ride notes, ride programs, and events.',
  },
  {
    href: '#operations',
    label: 'Operations',
    description: 'Stores, organizations, campaigns, and trail ops.',
  },
  {
    href: '#accounts',
    label: 'People',
    description: 'Experts, participants, and account control.',
  },
];

function AdminQuickNav() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          Admin map
        </p>
        <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Jump to what needs work</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {adminNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900/70 dark:hover:bg-emerald-950/30"
          >
            <span className="text-sm font-semibold text-gray-950 dark:text-white">{item.label}</span>
            <span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-slate-300">{item.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-8 pb-10">
      <AdminHeader />
      <AdminQuickNav />
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
        id="content"
        eyebrow="Publishing area"
        title="Content"
        description="Review expert content, manage public ride programs, and keep event listings current."
      >
        <RideProgramsPanel />
        <RideNotesPanel />
        <UpcomingEventsPanel />
      </AdminSection>

      <AdminSection
        id="operations"
        eyebrow="Operations area"
        title="Operations"
        description="Manage stores, organizations, campaigns, trail ownership, trail services, and moderation."
      >
        <StoresAdminPanel />
        <OrganizationsPanel />
        <OrganizationMembersPanel />
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
