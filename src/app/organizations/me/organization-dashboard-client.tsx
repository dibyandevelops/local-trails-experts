'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import OrganizationProfileManagementPanel from '@/components/feature-components/organizations/organization-profile-management-panel';
import OrganizationCampaignsManagementPanel from '@/components/feature-components/organizations/organization-campaigns-management-panel';
import OrganizationMembersManagementPanel from '@/components/feature-components/organizations/organization-members-management-panel';
import OrganizationServicesManagementPanel from '@/components/feature-components/organizations/organization-services-management-panel';
import OrganizationGalleryManagementPanel from '@/components/feature-components/organizations/organization-gallery-management-panel';
import OrganizationTrailsManagementPanel from '@/components/feature-components/organizations/organization-trails-management-panel';

type ManagedOrganization = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  owner_user_id: string | null;
  membership_role: 'org_owner' | 'org_admin' | 'org_editor';
};

type ManagedTrail = {
  relation_id: string;
  id: string;
  slug: string | null;
  name: string;
  location: string | null;
  difficulty: string | null;
  sport_type: string | null;
  organization_id: string;
  relation_type: 'built_by' | 'verified_by' | 'maintained_by';
};

type TrailUpdate = {
  id: string;
  trail_id: string;
  organization_id: string | null;
  trail_name?: string | null;
  update_type: string;
  title: string;
  details: string | null;
  created_at: string;
};

const updateTypeOptions = [
  'condition_update',
  'maintenance_done',
  'hazard_reported',
  'hazard_cleared',
  'route_changed',
  'metadata_updated',
];

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data as T;
}

export default function OrganizationDashboardClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [updateTrailId, setUpdateTrailId] = useState('');
  const [updateType, setUpdateType] = useState(updateTypeOptions[0]);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDetails, setUpdateDetails] = useState('');
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const accessQuery = useQuery({
    queryKey: ['my-organization-access'],
    queryFn: () => fetchJson<{ organizations: ManagedOrganization[]; trails: ManagedTrail[] }>('/api/organizations/me'),
    retry: false,
  });

  useEffect(() => {
    if (accessQuery.error) {
      router.replace('/home');
    }
  }, [accessQuery.error, router]);

  const organizations = useMemo(
    () => accessQuery.data?.organizations || [],
    [accessQuery.data?.organizations]
  );
  const trails = useMemo(
    () => accessQuery.data?.trails || [],
    [accessQuery.data?.trails]
  );
  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) || organizations[0];
  const effectiveOrgId = selectedOrg?.id || '';
  const orgTrails = useMemo(
    () => trails.filter((trail) => trail.organization_id === effectiveOrgId),
    [effectiveOrgId, trails]
  );

  useEffect(() => {
    if (!selectedOrgId && organizations[0]?.id) setSelectedOrgId(organizations[0].id);
  }, [organizations, selectedOrgId]);

  const updatesQuery = useQuery({
    queryKey: ['organization-updates', effectiveOrgId],
    queryFn: () => fetchJson<{ updates: TrailUpdate[] }>(`/api/admin/trail-updates?organization_id=${effectiveOrgId}`),
    enabled: Boolean(effectiveOrgId),
  });

  const addUpdate = useMutation({
    mutationFn: () => fetchJson(`/api/trails/${updateTrailId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: effectiveOrgId,
        update_type: updateType,
        title: updateTitle,
        details: updateDetails,
      }),
    }),
    onSuccess: async () => {
      setUpdateTitle('');
      setUpdateDetails('');
      setMessage('Trail update posted.');
      await queryClient.invalidateQueries({ queryKey: ['organization-updates', effectiveOrgId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to post update.'),
  });
  const editUpdate = useMutation({
    mutationFn: () => fetchJson('/api/admin/trail-updates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingUpdateId,
        update_type: updateType,
        title: updateTitle,
        details: updateDetails,
      }),
    }),
    onSuccess: async () => {
      setEditingUpdateId(null);
      setUpdateTrailId('');
      setUpdateTitle('');
      setUpdateDetails('');
      setMessage('Trail update updated.');
      await queryClient.invalidateQueries({ queryKey: ['organization-updates', effectiveOrgId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to update trail update.'),
  });
  const isSavingUpdate = addUpdate.isPending || editUpdate.isPending;
  const startEditingUpdate = (update: TrailUpdate) => {
    setEditingUpdateId(update.id);
    setUpdateTrailId(update.trail_id);
    setUpdateType(update.update_type);
    setUpdateTitle(update.title);
    setUpdateDetails(update.details || '');
  };
  const cancelEditingUpdate = () => {
    setEditingUpdateId(null);
    setUpdateTrailId('');
    setUpdateType(updateTypeOptions[0]);
    setUpdateTitle('');
    setUpdateDetails('');
  };

  if (accessQuery.isLoading) {
    return <main className="container mx-auto px-4 py-10 text-sm text-gray-600 dark:text-slate-300">Loading organization access...</main>;
  }

  if (!organizations.length) {
    return (
      <main className="container mx-auto px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Organization Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">You are not assigned to an active organization yet.</p>
          <Link href="/organizations" className="mt-4 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400">
            View organizations
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 px-4 py-8 text-gray-900 dark:text-slate-100">
      <section className="rounded-2xl border border-green-900/10 bg-white p-6 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700 dark:text-emerald-300">Organization Operations</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">Manage your organization</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-slate-300">
              Manage your public organization, team, services, campaigns, and trail work.
            </p>
          </div>
          <select
            value={effectiveOrgId}
            onChange={(event) => setSelectedOrgId(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        {selectedOrg && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-950 dark:border dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100">
            <strong>{selectedOrg.name}</strong> · {selectedOrg.membership_role === 'org_owner' ? 'Organization owner' : selectedOrg.membership_role === 'org_admin' ? 'Organization admin' : 'Operations editor'}
            {selectedOrg.tagline ? <span> · {selectedOrg.tagline}</span> : null}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-organization-member-dialog', { detail: { organizationId: effectiveOrgId } }))}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
            >
              Add member
            </button>
          )}
          {selectedOrg?.membership_role === 'org_owner' && (
            <span className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white">
              Owner account
            </span>
          )}
        </div>
        {message && <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{message}</p>}
      </section>

      {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
        <section>
          <OrganizationProfileManagementPanel organization={selectedOrg} />
        </section>
      )}

      {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
        <OrganizationMembersManagementPanel organizationId={effectiveOrgId} />
      )}

      <OrganizationServicesManagementPanel organizationId={effectiveOrgId} organization={selectedOrg} />

      {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
        <OrganizationCampaignsManagementPanel organizationId={effectiveOrgId} trails={orgTrails} />
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trail operations</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Track the trails this organization works on and publish updates for those linked trails.
          </p>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
            <OrganizationTrailsManagementPanel organizationId={effectiveOrgId} initialTrails={orgTrails} />
          )}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Trail updates</h3>
            <div className="mt-4 space-y-3">
              <select
                value={updateTrailId}
                onChange={(event) => setUpdateTrailId(event.target.value)}
                disabled={Boolean(editingUpdateId)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
              >
                <option value="">Select linked trail</option>
                {orgTrails.map((trail) => <option key={trail.id} value={trail.id}>{trail.name}</option>)}
              </select>
              <select value={updateType} onChange={(event) => setUpdateType(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {updateTypeOptions.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
              </select>
              <input value={updateTitle} onChange={(event) => setUpdateTitle(event.target.value)} placeholder="Update title" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
              <textarea value={updateDetails} onChange={(event) => setUpdateDetails(event.target.value)} placeholder="Details" rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500" />
              <div className="flex flex-wrap justify-end gap-2">
                {editingUpdateId && (
                  <button
                    type="button"
                    onClick={cancelEditingUpdate}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  onClick={() => (editingUpdateId ? editUpdate.mutate() : addUpdate.mutate())}
                  disabled={!updateTrailId || !updateTitle || isSavingUpdate}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950"
                >
                  {isSavingUpdate && <LoadingSpinner />}
                  {editingUpdateId
                    ? editUpdate.isPending
                      ? 'Saving...'
                      : 'Save update'
                    : addUpdate.isPending
                      ? 'Posting...'
                      : 'Post update'}
                </button>
              </div>
            </div>
            <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
              {(updatesQuery.data?.updates || []).map((update) => (
                <div key={update.id} className="rounded-lg border border-gray-100 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{update.title}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{update.trail_name || 'Trail'} · {update.update_type.replaceAll('_', ' ')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditingUpdate(update)}
                      disabled={isSavingUpdate}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OrganizationGalleryManagementPanel organizationId={effectiveOrgId} />
    </main>
  );
}
