import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAdminOrganizations, type OrganizationOption } from '@/services/admin/admin.service';

type TrailOption = {
  id: string;
  name: string;
};

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type TrailUpdateType =
  | 'condition_update'
  | 'maintenance_done'
  | 'hazard_reported'
  | 'hazard_cleared'
  | 'route_changed'
  | 'metadata_updated';

const UPDATE_TYPE_OPTIONS: Array<{ value: TrailUpdateType; label: string }> = [
  { value: 'condition_update', label: 'Condition update' },
  { value: 'maintenance_done', label: 'Maintenance done' },
  { value: 'hazard_reported', label: 'Hazard reported' },
  { value: 'hazard_cleared', label: 'Hazard cleared' },
  { value: 'route_changed', label: 'Route changed' },
  { value: 'metadata_updated', label: 'Metadata updated' },
];

export default function OrganizationOpsPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedTrailId, setSelectedTrailId] = useState('');
  const [selectedUpdateOrgId, setSelectedUpdateOrgId] = useState('');
  const [updateType, setUpdateType] = useState<TrailUpdateType>('condition_update');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDetails, setUpdateDetails] = useState('');
  const [updateMediaUrls, setUpdateMediaUrls] = useState('');

  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [gallerySortOrder, setGallerySortOrder] = useState('0');

  const { data: organizations = [] } = useQuery<OrganizationOption[]>({
    queryKey: ['admin-organizations'],
    queryFn: fetchAdminOrganizations,
  });

  const { data: trails = [] } = useQuery<TrailOption[]>({
    queryKey: ['admin-trails-lite'],
    queryFn: async () => {
      const response = await fetch('/api/trails?pageSize=200&sort=newest');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load trails');
      }
      return (data?.trails || []).map((trail: any) => ({
        id: trail.id as string,
        name: trail.name as string,
      }));
    },
  });

  const { data: galleryItems = [], refetch: refetchGallery } = useQuery<GalleryItem[]>({
    queryKey: ['admin-org-gallery', selectedOrgId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${selectedOrgId}/gallery`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load gallery');
      }
      return data?.items || [];
    },
    enabled: Boolean(selectedOrgId),
  });

  const addGalleryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/organizations/${selectedOrgId}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: galleryImageUrl.trim(),
          caption: galleryCaption.trim() || null,
          sort_order: Number(gallerySortOrder || '0'),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add gallery item');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchGallery();
      setGalleryImageUrl('');
      setGalleryCaption('');
      setGallerySortOrder('0');
      setMessage('Gallery item added.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to add gallery item.');
    },
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/organizations/${selectedOrgId}/gallery/${itemId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete gallery item');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchGallery();
      setMessage('Gallery item deleted.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to delete gallery item.');
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/trails/${selectedTrailId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: selectedUpdateOrgId || null,
          update_type: updateType,
          title: updateTitle.trim(),
          details: updateDetails.trim() || null,
          media_urls: updateMediaUrls
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create trail update');
      }
      return data;
    },
    onSuccess: () => {
      setUpdateTitle('');
      setUpdateDetails('');
      setUpdateMediaUrls('');
      setMessage('Trail update posted.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to post trail update.');
    },
  });

  const canAddGallery = Boolean(selectedOrgId && galleryImageUrl.trim());
  const canPostUpdate = Boolean(selectedTrailId && updateTitle.trim());
  const orgOptions = useMemo(
    () => organizations.map((org) => ({ value: org.id, label: org.name })),
    [organizations]
  );

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Operations</h2>
      <p className="text-sm text-gray-600 mb-5">
        Manage organization gallery assets and publish trail update logs.
      </p>
      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Organization Gallery</h3>
          <div className="space-y-2">
            <select
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select organization</option>
              {orgOptions.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
            <input
              value={galleryImageUrl}
              onChange={(event) => setGalleryImageUrl(event.target.value)}
              placeholder="Image URL"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={galleryCaption}
              onChange={(event) => setGalleryCaption(event.target.value)}
              placeholder="Caption (optional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={gallerySortOrder}
              onChange={(event) => setGallerySortOrder(event.target.value)}
              placeholder="Sort order"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => addGalleryMutation.mutate()}
              disabled={!canAddGallery || addGalleryMutation.isPending}
              className="w-full rounded-lg bg-green-700 text-white px-4 py-2 text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
            >
              {addGalleryMutation.isPending ? 'Adding...' : 'Add gallery item'}
            </button>
          </div>

          {selectedOrgId && galleryItems.length > 0 && (
            <div className="mt-4 space-y-2">
              {galleryItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                  <p className="truncate text-xs text-gray-700">{item.caption || item.image_url}</p>
                  <button
                    type="button"
                    onClick={() => deleteGalleryMutation.mutate(item.id)}
                    className="ml-3 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Trail Updates</h3>
          <div className="space-y-2">
            <select
              value={selectedTrailId}
              onChange={(event) => setSelectedTrailId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select trail</option>
              {trails.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.name}
                </option>
              ))}
            </select>
            <select
              value={selectedUpdateOrgId}
              onChange={(event) => setSelectedUpdateOrgId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">No organization (optional)</option>
              {orgOptions.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
            <select
              value={updateType}
              onChange={(event) => setUpdateType(event.target.value as TrailUpdateType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {UPDATE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={updateTitle}
              onChange={(event) => setUpdateTitle(event.target.value)}
              placeholder="Update title"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={updateDetails}
              onChange={(event) => setUpdateDetails(event.target.value)}
              rows={3}
              placeholder="Update details"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={updateMediaUrls}
              onChange={(event) => setUpdateMediaUrls(event.target.value)}
              rows={3}
              placeholder="Media URLs (one per line)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => createUpdateMutation.mutate()}
              disabled={!canPostUpdate || createUpdateMutation.isPending}
              className="w-full rounded-lg bg-cyan-700 text-white px-4 py-2 text-sm font-semibold hover:bg-cyan-800 disabled:opacity-60"
            >
              {createUpdateMutation.isPending ? 'Posting...' : 'Post trail update'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
