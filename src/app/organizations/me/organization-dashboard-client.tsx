'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import OrganizationProgramsPanel from '@/components/feature-components/organizations/organization-programs-panel';
import OrganizationProfileManagementPanel from '@/components/feature-components/organizations/organization-profile-management-panel';
import OrganizationCampaignsManagementPanel from '@/components/feature-components/organizations/organization-campaigns-management-panel';
import OrganizationMembersManagementPanel from '@/components/feature-components/organizations/organization-members-management-panel';
import OrganizationProgramRequestsPanel from '@/components/feature-components/organizations/organization-program-requests-panel';
import OrganizationServicesManagementPanel from '@/components/feature-components/organizations/organization-services-management-panel';
import OrganizationGalleryManagementPanel from '@/components/feature-components/organizations/organization-gallery-management-panel';
import ExpertRideNotesPanel from '@/components/experts/expert-ride-notes-panel';

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
  id: string;
  slug: string | null;
  name: string;
  location: string | null;
  difficulty: string | null;
  sport_type: string | null;
  organization_id: string;
  relation_type: string;
};

type TrailService = {
  id: string;
  trail_id: string;
  trail_name: string | null;
  organization_id: string | null;
  service_type: 'shuttle' | 'lift' | 'support_vehicle';
  title: string;
  description: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  price_note: string | null;
  schedule_note: string | null;
  is_active: boolean;
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
  const [serviceTrailId, setServiceTrailId] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceType, setServiceType] = useState<TrailService['service_type']>('shuttle');
  const [serviceContact, setServiceContact] = useState('');
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

  const servicesQuery = useQuery({
    queryKey: ['organization-services', effectiveOrgId],
    queryFn: () => fetchJson<{ services: TrailService[] }>(`/api/admin/trail-services?organization_id=${effectiveOrgId}&include_inactive=true`),
    enabled: Boolean(effectiveOrgId),
  });

  const updatesQuery = useQuery({
    queryKey: ['organization-updates', effectiveOrgId],
    queryFn: () => fetchJson<{ updates: TrailUpdate[] }>(`/api/admin/trail-updates?organization_id=${effectiveOrgId}`),
    enabled: Boolean(effectiveOrgId),
  });

  const addService = useMutation({
    mutationFn: () => fetchJson('/api/admin/trail-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trail_id: serviceTrailId,
        organization_id: effectiveOrgId,
        service_type: serviceType,
        title: serviceTitle,
        contact_phone: serviceContact,
      }),
    }),
    onSuccess: async () => {
      setServiceTitle('');
      setServiceContact('');
      setMessage('Trail service added.');
      await queryClient.invalidateQueries({ queryKey: ['organization-services', effectiveOrgId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to add service.'),
  });

  const toggleService = useMutation({
    mutationFn: (service: TrailService) => fetchJson('/api/admin/trail-services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: service.id, is_active: !service.is_active }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization-services', effectiveOrgId] });
    },
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
  const togglingServiceId = toggleService.variables?.id;
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
    return <main className="container mx-auto px-4 py-10 text-sm text-gray-600">Loading organization access...</main>;
  }

  if (!organizations.length) {
    return (
      <main className="container mx-auto px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Organization Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">You are not assigned to an active organization yet.</p>
          <Link href="/organizations" className="mt-4 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
            View organizations
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto space-y-6 px-4 py-8">
      <section className="rounded-2xl border border-green-900/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">Organization Operations</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Manage your organization</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Manage your public organization, programs, participant requests, and linked trail operations.
            </p>
          </div>
          <select
            value={effectiveOrgId}
            onChange={(event) => setSelectedOrgId(event.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        {selectedOrg && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-950">
            <strong>{selectedOrg.name}</strong> · {selectedOrg.membership_role === 'org_owner' ? 'Organization owner' : selectedOrg.membership_role === 'org_admin' ? 'Organization admin' : 'Operations editor'}
            {selectedOrg.tagline ? <span> · {selectedOrg.tagline}</span> : null}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="#organization-ride-notes" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
            Write organization ride note
          </Link>
          {selectedOrg?.membership_role === 'org_owner' && (
            <span className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white">
              Owner account
            </span>
          )}
        </div>
        {message && <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{message}</p>}
      </section>

      <OrganizationProgramsPanel organizationId={effectiveOrgId} trails={orgTrails} />

      {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
        <section className="grid gap-6 xl:grid-cols-2">
          <OrganizationProfileManagementPanel organization={selectedOrg} />
          <OrganizationMembersManagementPanel organizationId={effectiveOrgId} />
        </section>
      )}

      {(selectedOrg?.membership_role === 'org_owner' || selectedOrg?.membership_role === 'org_admin') && (
        <OrganizationCampaignsManagementPanel organizationId={effectiveOrgId} trails={orgTrails} />
      )}

      <OrganizationServicesManagementPanel organizationId={effectiveOrgId} />
      <OrganizationGalleryManagementPanel organizationId={effectiveOrgId} />
      <div id="organization-ride-notes" className="scroll-mt-24">
        <ExpertRideNotesPanel key={effectiveOrgId} managedOrganizationId={effectiveOrgId} />
      </div>
      <OrganizationProgramRequestsPanel organizationId={effectiveOrgId} />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Trail Services</h2>
          <div className="mt-4 space-y-3">
            <select value={serviceTrailId} onChange={(event) => setServiceTrailId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select linked trail</option>
              {orgTrails.map((trail) => <option key={trail.id} value={trail.id}>{trail.name}</option>)}
            </select>
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value as TrailService['service_type'])} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="shuttle">Shuttle</option>
              <option value="lift">Lift</option>
              <option value="support_vehicle">Support vehicle</option>
            </select>
            <input value={serviceTitle} onChange={(event) => setServiceTitle(event.target.value)} placeholder="Service title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={serviceContact} onChange={(event) => setServiceContact(event.target.value)} placeholder="Contact phone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button
              onClick={() => addService.mutate()}
              disabled={!serviceTrailId || !serviceTitle || addService.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {addService.isPending && <LoadingSpinner />}
              {addService.isPending ? 'Adding...' : 'Add service'}
            </button>
          </div>
          <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
            {(servicesQuery.data?.services || []).map((service) => (
              <div key={service.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{service.title}</p>
                  <button
                    onClick={() => toggleService.mutate(service)}
                    disabled={toggleService.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-60"
                  >
                    {togglingServiceId === service.id && <LoadingSpinner />}
                    {togglingServiceId === service.id
                      ? 'Saving...'
                      : service.is_active
                        ? 'Mark out'
                        : 'Mark available'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {service.trail_name || 'Trail'} · {service.service_type} · {service.is_active ? 'Available' : 'Out of service'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Trail Updates</h2>
          <div className="mt-4 space-y-3">
            <select
              value={updateTrailId}
              onChange={(event) => setUpdateTrailId(event.target.value)}
              disabled={Boolean(editingUpdateId)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Select linked trail</option>
              {orgTrails.map((trail) => <option key={trail.id} value={trail.id}>{trail.name}</option>)}
            </select>
            <select value={updateType} onChange={(event) => setUpdateType(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {updateTypeOptions.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
            </select>
            <input value={updateTitle} onChange={(event) => setUpdateTitle(event.target.value)} placeholder="Update title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={updateDetails} onChange={(event) => setUpdateDetails(event.target.value)} placeholder="Details" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            {editingUpdateId && (
              <button
                type="button"
                onClick={cancelEditingUpdate}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel edit
              </button>
            )}
            <button
              onClick={() => (editingUpdateId ? editUpdate.mutate() : addUpdate.mutate())}
              disabled={!updateTrailId || !updateTitle || isSavingUpdate}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
          <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
            {(updatesQuery.data?.updates || []).map((update) => (
              <div key={update.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{update.title}</p>
                    <p className="text-xs text-gray-500">{update.trail_name || 'Trail'} · {update.update_type.replaceAll('_', ' ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditingUpdate(update)}
                    disabled={isSavingUpdate}
                    className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
