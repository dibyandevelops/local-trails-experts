'use client';

import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AdminHeader from '@/components/admin/admin-header';
import ImpactStatsPanel from '@/components/admin/impact-stats-panel';

function AdminPanelLoading() {
  return <p className="text-sm text-gray-500 dark:text-slate-400">Loading admin tools...</p>;
}

const ExpertApplicationsPanel = dynamic(() => import('@/components/admin/expert-applications-panel'), { loading: AdminPanelLoading });
const TrailRequestsPanel = dynamic(() => import('@/components/admin/trail-requests-panel'), { loading: AdminPanelLoading });
const StoreRequestsPanel = dynamic(() => import('@/components/admin/store-requests-panel'), { loading: AdminPanelLoading });
const RideProgramsPanel = dynamic(() => import('@/components/admin/ride-programs-panel'), { loading: AdminPanelLoading });
const RideNotesPanel = dynamic(() => import('@/components/admin/ride-notes-panel'), { loading: AdminPanelLoading });
const UpcomingEventsPanel = dynamic(() => import('@/components/admin/upcoming-events-panel'), { loading: AdminPanelLoading });
const StoresAdminPanel = dynamic(() => import('@/components/admin/stores-admin-panel'), { loading: AdminPanelLoading });
const OrganizationsPanel = dynamic(() => import('@/components/admin/organizations-panel'), { loading: AdminPanelLoading });
const OrganizationSubscriptionSettingsPanel = dynamic(() => import('@/components/admin/organization-subscription-settings-panel'), { loading: AdminPanelLoading });
const OrganizationSubscriptionPaymentsPanel = dynamic(() => import('@/components/admin/organization-subscription-payments-panel'), { loading: AdminPanelLoading });
const OrganizationMembersPanel = dynamic(() => import('@/components/admin/organization-members-panel'), { loading: AdminPanelLoading });
const FundraisingCampaignsPanel = dynamic(() => import('@/components/admin/fundraising-campaigns-panel'), { loading: AdminPanelLoading });
const OrganizationOpsPanel = dynamic(() => import('@/components/admin/organization-ops-panel'), { loading: AdminPanelLoading });
const HazardousTrailsPanel = dynamic(() => import('@/components/admin/hazardous-trails-panel'), { loading: AdminPanelLoading });
const PendingTrailsPanel = dynamic(() => import('@/components/admin/pending-trails-panel'), { loading: AdminPanelLoading });
const UsersPanel = dynamic(() => import('@/components/admin/users-panel'), { loading: AdminPanelLoading });
const MarketplaceModerationPanel = dynamic(() => import('@/components/admin/marketplace-moderation-panel'), { loading: AdminPanelLoading });

function AdminSection({
  id,
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      className="group scroll-mt-24 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 border-b border-gray-200 pb-4 dark:border-slate-800">
        <span className="min-w-0 flex-1">
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
      {open ? <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-6">{children}</div> : null}
    </details>
  );
}

type AdminSectionId = 'requests' | 'content' | 'operations' | 'accounts';

const adminNavItems: Array<{
  id: AdminSectionId;
  href: `#${AdminSectionId}`;
  label: string;
  description: string;
}> = [
  {
    id: 'requests',
    href: '#requests',
    label: 'Requests',
    description: 'Applications, rider requests, and shop requests.',
  },
  {
    id: 'content',
    href: '#content',
    label: 'Content',
    description: 'Ride notes, ride programs, and events.',
  },
  {
    id: 'operations',
    href: '#operations',
    label: 'Operations',
    description: 'Stores, organizations, campaigns, and trail ops.',
  },
  {
    id: 'accounts',
    href: '#accounts',
    label: 'People',
    description: 'Experts, participants, and account control.',
  },
];

function AdminQuickNav({
  activeSection,
  onNavigate,
}: {
  activeSection: AdminSectionId | null;
  onNavigate: (section: AdminSectionId) => void;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
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
            aria-current={activeSection === item.id ? 'location' : undefined}
            onClick={() => onNavigate(item.id)}
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
  const [activeSection, setActiveSection] = useState<AdminSectionId | null>('requests');

  useEffect(() => {
    const selectHashSection = () => {
      const section = window.location.hash.slice(1) as AdminSectionId;
      if (adminNavItems.some((item) => item.id === section)) {
        setActiveSection(section);
      }
    };

    selectHashSection();
    window.addEventListener('hashchange', selectHashSection);
    return () => window.removeEventListener('hashchange', selectHashSection);
  }, []);

  const handleSectionToggle = (section: AdminSectionId, open: boolean) => {
    setActiveSection((current) => {
      if (open) return section;
      return current === section ? null : current;
    });
  };

  return (
    <div className="space-y-5 pb-8 sm:space-y-8 sm:pb-10">
      <AdminHeader />
      <AdminQuickNav activeSection={activeSection} onNavigate={setActiveSection} />
      <ImpactStatsPanel />

      <AdminSection
        id="requests"
        open={activeSection === 'requests'}
        onOpenChange={(open) => handleSectionToggle('requests', open)}
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
        open={activeSection === 'content'}
        onOpenChange={(open) => handleSectionToggle('content', open)}
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
        open={activeSection === 'operations'}
        onOpenChange={(open) => handleSectionToggle('operations', open)}
        eyebrow="Operations area"
        title="Operations"
        description="Manage stores, organizations, campaigns, trail ownership, trail services, and moderation."
      >
        <StoresAdminPanel />
        <MarketplaceModerationPanel />
        <OrganizationSubscriptionSettingsPanel />
        <OrganizationSubscriptionPaymentsPanel />
        <OrganizationsPanel />
        <OrganizationMembersPanel />
        <FundraisingCampaignsPanel />
        <OrganizationOpsPanel />
        <HazardousTrailsPanel />
        <PendingTrailsPanel />
      </AdminSection>

      <AdminSection
        id="accounts"
        open={activeSection === 'accounts'}
        onOpenChange={(open) => handleSectionToggle('accounts', open)}
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
