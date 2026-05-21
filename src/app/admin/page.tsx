'use client';

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

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <AdminHeader />
      <ExpertApplicationsPanel />
      <TrailRequestsPanel />
      <StoreRequestsPanel />
      <StoresAdminPanel />
      <UpcomingEventsPanel />
      <OrganizationMembersPanel />
      <OrganizationsPanel />
      <OrganizationOpsPanel />
      <UsersPanel
        role="expert"
        title="Experts"
        description="Manage expert accounts and remove users if needed."
      />
      <UsersPanel
        role="participant"
        title="Participants"
        description="Review participant accounts and delete when necessary."
      />
      <HazardousTrailsPanel />
      <PendingTrailsPanel />
    </div>
  );
}
