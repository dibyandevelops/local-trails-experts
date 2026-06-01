'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ManagedOrganization = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  membership_role: 'org_admin' | 'org_editor';
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

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data as T;
}

export default function TrailBuilderDashboardClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [galleryUrl, setGalleryUrl] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [serviceTrailId, setServiceTrailId] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceType, setServiceType] = useState<TrailService['service_type']>('shuttle');
  const [serviceContact, setServiceContact] = useState('');
  const [updateTrailId, setUpdateTrailId] = useState('');
  const [updateType, setUpdateType] = useState(updateTypeOptions[0]);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDetails, setUpdateDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const accessQuery = useQuery({
    queryKey: ['my-trail-builder-access'],
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
    queryKey: ['builder-services', effectiveOrgId],
    queryFn: () => fetchJson<{ services: TrailService[] }>(`/api/admin/trail-services?organization_id=${effectiveOrgId}&include_inactive=true`),
    enabled: Boolean(effectiveOrgId),
  });

  const galleryQuery = useQuery({
    queryKey: ['builder-gallery', effectiveOrgId],
    queryFn: () => fetchJson<{ items: GalleryItem[] }>(`/api/organizations/${effectiveOrgId}/gallery`),
    enabled: Boolean(effectiveOrgId),
  });

  const updatesQuery = useQuery({
    queryKey: ['builder-updates', effectiveOrgId],
    queryFn: () => fetchJson<{ updates: TrailUpdate[] }>(`/api/admin/trail-updates?organization_id=${effectiveOrgId}`),
    enabled: Boolean(effectiveOrgId),
  });

  const addGallery = useMutation({
    mutationFn: () => fetchJson(`/api/organizations/${effectiveOrgId}/gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: galleryUrl, caption: galleryCaption }),
    }),
    onSuccess: async () => {
      setGalleryUrl('');
      setGalleryCaption('');
      setMessage('Gallery image added.');
      await queryClient.invalidateQueries({ queryKey: ['builder-gallery', effectiveOrgId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to add image.'),
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
      await queryClient.invalidateQueries({ queryKey: ['builder-services', effectiveOrgId] });
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
      await queryClient.invalidateQueries({ queryKey: ['builder-services', effectiveOrgId] });
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
      await queryClient.invalidateQueries({ queryKey: ['builder-updates', effectiveOrgId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Failed to post update.'),
  });

  if (accessQuery.isLoading) {
    return <main className="container mx-auto px-4 py-10 text-sm text-gray-600">Loading trail builder access...</main>;
  }

  if (!organizations.length) {
    return (
      <main className="container mx-auto px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Trail Builder Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">You are not assigned to an active trail builder yet.</p>
          <Link href="/organizations" className="mt-4 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
            View trail builders
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-700">Trail Builder Operations</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Manage your trail builder</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Members can manage gallery images, trail services, and trail updates for linked visible trails only.
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
            <strong>{selectedOrg.name}</strong> · {selectedOrg.membership_role === 'org_admin' ? 'Builder admin' : 'Builder editor'}
            {selectedOrg.tagline ? <span> · {selectedOrg.tagline}</span> : null}
          </div>
        )}
        {message && <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{message}</p>}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Gallery</h2>
          <div className="mt-4 space-y-3">
            <input value={galleryUrl} onChange={(event) => setGalleryUrl(event.target.value)} placeholder="Image URL" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={galleryCaption} onChange={(event) => setGalleryCaption(event.target.value)} placeholder="Caption" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button onClick={() => addGallery.mutate()} disabled={!galleryUrl || addGallery.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Add image</button>
          </div>
          <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
            {(galleryQuery.data?.items || []).map((item) => (
              <div key={item.id} className="overflow-hidden rounded-lg border border-gray-100 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.caption || 'Trail builder gallery image'}
                  className="h-32 w-full bg-gray-100 object-cover"
                />
                <div className="p-3">
                  <p className="truncate font-medium text-gray-900">{item.caption || 'Gallery image'}</p>
                  <a
                    href={item.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-xs text-green-700 hover:text-green-800"
                  >
                    Open image
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

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
            <button onClick={() => addService.mutate()} disabled={!serviceTrailId || !serviceTitle || addService.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Add service</button>
          </div>
          <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
            {(servicesQuery.data?.services || []).map((service) => (
              <div key={service.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{service.title}</p>
                  <button onClick={() => toggleService.mutate(service)} className="rounded-full border border-gray-300 px-2 py-1 text-xs text-gray-700">
                    {service.is_active ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{service.trail_name || 'Trail'} · {service.service_type}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Trail Updates</h2>
          <div className="mt-4 space-y-3">
            <select value={updateTrailId} onChange={(event) => setUpdateTrailId(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select linked trail</option>
              {orgTrails.map((trail) => <option key={trail.id} value={trail.id}>{trail.name}</option>)}
            </select>
            <select value={updateType} onChange={(event) => setUpdateType(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {updateTypeOptions.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
            </select>
            <input value={updateTitle} onChange={(event) => setUpdateTitle(event.target.value)} placeholder="Update title" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={updateDetails} onChange={(event) => setUpdateDetails(event.target.value)} placeholder="Details" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button onClick={() => addUpdate.mutate()} disabled={!updateTrailId || !updateTitle || addUpdate.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Post update</button>
          </div>
          <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
            {(updatesQuery.data?.updates || []).map((update) => (
              <div key={update.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <p className="font-medium text-gray-900">{update.title}</p>
                <p className="text-xs text-gray-500">{update.trail_name || 'Trail'} · {update.update_type.replaceAll('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
