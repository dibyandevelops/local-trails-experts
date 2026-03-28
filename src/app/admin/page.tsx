'use client';

import AdminHeader from '@/components/admin/admin-header';
import ExpertApplicationsPanel from '@/components/admin/expert-applications-panel';
import TrailRequestsPanel from '@/components/admin/trail-requests-panel';
import PendingTrailsPanel from '@/components/admin/pending-trails-panel';
import UsersPanel from '@/components/admin/users-panel';
import HazardousTrailsPanel from '@/components/admin/hazardous-trails-panel';
import StoresPanel from '@/components/admin/stores-panel';

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <AdminHeader />
      <ExpertApplicationsPanel />
      <TrailRequestsPanel />
      <StoresPanel />
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
