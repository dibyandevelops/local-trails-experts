import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAdminOrganizations, type OrganizationOption } from '@/services/admin/admin.service';
import AppDialog from '@/components/ui/app-dialog';

type TrailOption = {
  id: string;
  name: string;
};

type GalleryItem = {
  id: string;
  organization_id: string;
  organization_name?: string | null;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type TrailService = {
  id: string;
  trail_id: string;
  trail_name?: string | null;
  organization_id: string | null;
  organization_name?: string | null;
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

type TrailUpdateType =
  | 'condition_update'
  | 'maintenance_done'
  | 'hazard_reported'
  | 'hazard_cleared'
  | 'route_changed'
  | 'metadata_updated';

type TrailUpdate = {
  id: string;
  trail_id: string;
  trail_name?: string | null;
  organization_id: string | null;
  organization_name?: string | null;
  actor_name?: string | null;
  update_type: TrailUpdateType;
  title: string;
  details: string | null;
  created_at: string;
};

const UPDATE_TYPE_OPTIONS: Array<{ value: TrailUpdateType; label: string }> = [
  { value: 'condition_update', label: 'Condition update' },
  { value: 'maintenance_done', label: 'Maintenance done' },
  { value: 'hazard_reported', label: 'Hazard reported' },
  { value: 'hazard_cleared', label: 'Hazard cleared' },
  { value: 'route_changed', label: 'Route changed' },
  { value: 'metadata_updated', label: 'Metadata updated' },
];

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('Image is too large. Use an image under 4MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) reject(new Error('Failed to read image.'));
      else resolve(result);
    };
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });
}

export default function OrganizationOpsPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteGalleryTarget, setDeleteGalleryTarget] = useState<GalleryItem | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<TrailService | null>(null);
  const [deleteUpdateTarget, setDeleteUpdateTarget] = useState<TrailUpdate | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedTrailId, setSelectedTrailId] = useState('');
  const [selectedUpdateOrgId, setSelectedUpdateOrgId] = useState('');
  const [updateType, setUpdateType] = useState<TrailUpdateType>('condition_update');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDetails, setUpdateDetails] = useState('');
  const [updateMediaUrls, setUpdateMediaUrls] = useState('');

  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryUploadName, setGalleryUploadName] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [gallerySortOrder, setGallerySortOrder] = useState('0');
  const [serviceTrailId, setServiceTrailId] = useState('');
  const [serviceOrganizationId, setServiceOrganizationId] = useState('');
  const [serviceType, setServiceType] = useState<'shuttle' | 'lift' | 'support_vehicle'>('shuttle');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceContactPhone, setServiceContactPhone] = useState('');
  const [serviceContactWhatsapp, setServiceContactWhatsapp] = useState('');
  const [serviceContactEmail, setServiceContactEmail] = useState('');
  const [servicePriceNote, setServicePriceNote] = useState('');
  const [serviceScheduleNote, setServiceScheduleNote] = useState('');
  const [serviceIsActive, setServiceIsActive] = useState(true);

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
      const params = new URLSearchParams();
      if (selectedOrgId) params.set('organization_id', selectedOrgId);
      const response = await fetch(`/api/admin/organization-gallery?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load gallery');
      }
      return data?.items || [];
    },
  });
  const { data: trailServices = [], refetch: refetchTrailServices } = useQuery<TrailService[]>({
    queryKey: ['admin-trail-services', serviceTrailId],
    queryFn: async () => {
      const params = new URLSearchParams({ include_inactive: 'true' });
      if (serviceTrailId) params.set('trail_id', serviceTrailId);
      const response = await fetch(`/api/admin/trail-services?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch trail services');
      }
      return data?.services || [];
    },
  });
  const { data: trailUpdates = [], refetch: refetchTrailUpdates } = useQuery<TrailUpdate[]>({
    queryKey: ['admin-trail-updates', selectedTrailId, selectedUpdateOrgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTrailId) params.set('trail_id', selectedTrailId);
      if (selectedUpdateOrgId) params.set('organization_id', selectedUpdateOrgId);
      const response = await fetch(`/api/admin/trail-updates?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch trail updates');
      }
      return data?.updates || [];
    },
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
      setGalleryUploadName('');
      setGalleryCaption('');
      setGallerySortOrder('0');
      setGalleryOpen(false);
      setMessage('Gallery item added.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to add gallery item.');
    },
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async (item: GalleryItem) => {
      const response = await fetch(`/api/organizations/${item.organization_id}/gallery/${item.id}`, {
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
      setDeleteGalleryTarget(null);
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
    onSuccess: async () => {
      await refetchTrailUpdates();
      setUpdateTitle('');
      setUpdateDetails('');
      setUpdateMediaUrls('');
      setUpdateOpen(false);
      setMessage('Trail update posted.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to post trail update.');
    },
  });
  const createTrailServiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/trail-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: serviceTrailId,
          organization_id: serviceOrganizationId || null,
          service_type: serviceType,
          title: serviceTitle.trim(),
          description: serviceDescription.trim() || null,
          contact_phone: serviceContactPhone.trim() || null,
          contact_whatsapp: serviceContactWhatsapp.trim() || null,
          contact_email: serviceContactEmail.trim() || null,
          price_note: servicePriceNote.trim() || null,
          schedule_note: serviceScheduleNote.trim() || null,
          is_active: serviceIsActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create trail service');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchTrailServices();
      setMessage('Trail service updated.');
      setServiceType('shuttle');
      setServiceTitle('');
      setServiceDescription('');
      setServiceContactPhone('');
      setServiceContactWhatsapp('');
      setServiceContactEmail('');
      setServicePriceNote('');
      setServiceScheduleNote('');
      setServiceIsActive(true);
      setServiceOpen(false);
      setMessage('Trail service added.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to add trail service.');
    },
  });
  const toggleTrailServiceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await fetch('/api/admin/trail-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update trail service');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchTrailServices();
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update trail service.');
    },
  });
  const deleteTrailServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/trail-services/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete trail service');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchTrailServices();
      setDeleteServiceTarget(null);
      setMessage('Trail service deleted.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to delete trail service.');
    },
  });
  const deleteTrailUpdateMutation = useMutation({
    mutationFn: async (update: TrailUpdate) => {
      const response = await fetch('/api/admin/trail-updates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: update.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete trail update');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchTrailUpdates();
      setDeleteUpdateTarget(null);
      setMessage('Trail update deleted.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to delete trail update.');
    },
  });

  const canAddGallery = Boolean(selectedOrgId && galleryImageUrl.trim());
  const canPostUpdate = Boolean(selectedTrailId && updateTitle.trim());
  const canCreateService = Boolean(serviceTrailId && serviceTitle.trim());
  const orgOptions = useMemo(
    () =>
      organizations
        .filter((org) => org.is_active)
        .map((org) => ({ value: org.id, label: org.name })),
    [organizations]
  );
  const updateMediaList = updateMediaUrls
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  const updateImagePreviews = updateMediaList.filter((value) =>
    value.startsWith('data:image/')
  );
  const removeUpdateMediaUrl = (url: string) => {
    setUpdateMediaUrls((prev) =>
      prev
        .split('\n')
        .map((value) => value.trim())
        .filter((value) => value && value !== url)
        .join('\n')
    );
  };
  const handleUpdateMediaUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const fileList = Array.from(files);
      const dataUrls = await Promise.all(fileList.map(readImageFileAsDataUrl));
      setUpdateMediaUrls((prev) =>
        [...prev.split('\n').map((value) => value.trim()).filter(Boolean), ...dataUrls].join('\n')
      );
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to upload images.');
    }
  };

  const galleryForm = (
    <div className="mt-5 space-y-3">
      <select
        value={selectedOrgId}
        onChange={(event) => setSelectedOrgId(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Select trail builder</option>
        {orgOptions.map((org) => (
          <option key={org.value} value={org.value}>
            {org.label}
          </option>
        ))}
      </select>
      <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div>
          <label className="text-xs font-semibold uppercase text-gray-500">
            Image URL
          </label>
          <input
            value={galleryImageUrl}
            onChange={(event) => {
              setGalleryImageUrl(event.target.value);
              setGalleryUploadName('');
            }}
            placeholder="Paste an image URL or upload below"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-green-300 bg-white p-4 text-center hover:bg-green-50">
          <span className="text-sm font-semibold text-green-800">Upload image</span>
          <span className="mt-1 text-xs text-gray-500">
            JPG, PNG, or WebP under 4MB. Stored as data URL for now.
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const result = await readImageFileAsDataUrl(file);
                setGalleryImageUrl(result);
                setGalleryUploadName(file.name);
                setMessage(null);
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Failed to upload image.');
              }
              event.target.value = '';
            }}
            className="sr-only"
          />
        </label>
        {galleryUploadName && (
          <p className="text-xs font-semibold text-gray-700">
            Selected: {galleryUploadName}
          </p>
        )}
        {galleryImageUrl.startsWith('data:image/') && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <Image
              src={galleryImageUrl}
              alt="Gallery upload preview"
              width={640}
              height={240}
              unoptimized
              className="h-32 w-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setGalleryImageUrl('');
                setGalleryUploadName('');
              }}
              className="w-full border-t border-gray-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Remove uploaded image
            </button>
          </div>
        )}
      </div>
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
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setGalleryOpen(false)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => addGalleryMutation.mutate()}
          disabled={!canAddGallery || addGalleryMutation.isPending}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {addGalleryMutation.isPending ? 'Adding...' : 'Add gallery item'}
        </button>
      </div>
    </div>
  );

  const serviceForm = (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={serviceTrailId}
          onChange={(event) => setServiceTrailId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select trail</option>
          {trails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
        <select
          value={serviceOrganizationId}
          onChange={(event) => setServiceOrganizationId(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">No trail builder</option>
          {orgOptions.map((org) => (
            <option key={org.value} value={org.value}>
              {org.label}
            </option>
          ))}
        </select>
        <select
          value={serviceType}
          onChange={(event) => setServiceType(event.target.value as 'shuttle' | 'lift' | 'support_vehicle')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="shuttle">Shuttle</option>
          <option value="lift">Lift</option>
          <option value="support_vehicle">Support vehicle</option>
        </select>
        <input
          value={serviceTitle}
          onChange={(event) => setServiceTitle(event.target.value)}
          placeholder="Service title"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={serviceContactPhone}
          onChange={(event) => setServiceContactPhone(event.target.value)}
          placeholder="Phone (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={serviceContactWhatsapp}
          onChange={(event) => setServiceContactWhatsapp(event.target.value)}
          placeholder="WhatsApp (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={serviceContactEmail}
          onChange={(event) => setServiceContactEmail(event.target.value)}
          placeholder="Email (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={servicePriceNote}
          onChange={(event) => setServicePriceNote(event.target.value)}
          placeholder="Price note"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={serviceScheduleNote}
          onChange={(event) => setServiceScheduleNote(event.target.value)}
          placeholder="Schedule note"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={serviceDescription}
          onChange={(event) => setServiceDescription(event.target.value)}
          placeholder="Description (optional)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
        <input
          type="checkbox"
          checked={serviceIsActive}
          onChange={(event) => setServiceIsActive(event.target.checked)}
        />
        Service is active
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setServiceOpen(false)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createTrailServiceMutation.mutate()}
          disabled={!canCreateService || createTrailServiceMutation.isPending}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {createTrailServiceMutation.isPending ? 'Adding...' : 'Add service'}
        </button>
      </div>
    </div>
  );

  const trailUpdateForm = (
    <div className="mt-5 space-y-3">
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
        <option value="">No trail builder (optional)</option>
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
      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300 bg-white p-4 text-center hover:bg-cyan-50">
          <span className="text-sm font-semibold text-cyan-800">Upload update images</span>
          <span className="mt-1 text-xs text-gray-500">
            Select one or more images under 4MB each. They will be added to media URLs.
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (event) => {
              await handleUpdateMediaUpload(event.target.files);
              event.target.value = '';
            }}
            className="sr-only"
          />
        </label>
        {updateImagePreviews.length > 0 && (
          <p className="text-xs font-semibold text-gray-700">
            Uploaded images: {updateImagePreviews.length}
          </p>
        )}
        {updateImagePreviews.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {updateImagePreviews.map((url) => (
              <div key={url} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <Image
                  src={url}
                  alt="Trail update upload preview"
                  width={360}
                  height={180}
                  unoptimized
                  className="h-24 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeUpdateMediaUrl(url)}
                  className="w-full border-t border-gray-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setUpdateOpen(false)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createUpdateMutation.mutate()}
          disabled={!canPostUpdate || createUpdateMutation.isPending}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
        >
          {createUpdateMutation.isPending ? 'Posting...' : 'Post trail update'}
        </button>
      </div>
    </div>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Trail Builder Operations</h2>
      <p className="text-sm text-gray-600 mb-5">
        Manage trail builder gallery assets and publish trail update logs.
      </p>
      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Trail Builder Gallery</h3>
              <p className="mt-1 text-xs text-gray-600">Gallery assets grouped by trail builder.</p>
            </div>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
            >
              Add gallery item
            </button>
          </div>
          <div className="mb-3 max-w-sm">
            <select
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All trail builders</option>
              {orgOptions.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
          </div>
          {galleryItems.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No gallery items found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Sort</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {galleryItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url}
                            alt={item.caption || 'Trail builder gallery image'}
                            className="h-14 w-20 rounded-lg bg-gray-100 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{item.caption || 'Untitled image'}</p>
                            <p className="mt-1 max-w-xs truncate text-xs text-gray-600">{item.image_url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {item.organization_name || 'Unknown trail builder'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">{item.sort_order}</td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <a
                            href={item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => setDeleteGalleryTarget(item)}
                            disabled={deleteGalleryMutation.isPending}
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Trail Services</h3>
              <p className="mt-1 text-xs text-gray-600">Shuttle, lift, and support vehicle options.</p>
            </div>
            <button
              type="button"
              onClick={() => setServiceOpen(true)}
              className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
            >
              Add trail service
            </button>
          </div>
          {trailServices.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No trail services found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Trail</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {trailServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-gray-900">
                          {service.title} · {service.service_type.replace('_', ' ')}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-gray-600">
                          {service.price_note || service.schedule_note || service.description || 'No notes'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {service.trail_name || 'Unknown trail'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {service.organization_name || 'No trail builder'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        <p>{service.contact_phone || 'No phone'}</p>
                        <p>{service.contact_whatsapp || 'No WhatsApp'}</p>
                        <p className="max-w-[180px] break-all">{service.contact_email || 'No email'}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                            service.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {service.is_active ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleTrailServiceMutation.mutate({
                                id: service.id,
                                is_active: !service.is_active,
                              })
                            }
                            disabled={toggleTrailServiceMutation.isPending}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {service.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteServiceTarget(service)}
                            disabled={deleteTrailServiceMutation.isPending}
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Trail Updates</h3>
              <p className="mt-1 text-xs text-gray-600">Condition, maintenance, route, and hazard updates.</p>
            </div>
            <button
              type="button"
              onClick={() => setUpdateOpen(true)}
              className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800"
            >
              Post trail update
            </button>
          </div>
          {trailUpdates.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No trail updates found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200">
              <table className="min-w-[950px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Update</th>
                    <th className="px-4 py-3">Trail</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {trailUpdates.map((update) => (
                    <tr key={update.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-gray-900">
                          {update.title} · {update.update_type.replace('_', ' ')}
                        </p>
                        {update.details && (
                          <p className="mt-1 max-w-xs text-xs text-gray-600">{update.details}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {update.trail_name || 'Unknown trail'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {update.organization_name || 'No trail builder'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {update.actor_name || 'System'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600">
                        {new Date(update.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setDeleteUpdateTarget(update)}
                            disabled={deleteTrailUpdateMutation.isPending}
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <AppDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        title="Add gallery item"
        description="Add a public trail builder gallery image."
        maxWidthClassName="max-w-xl"
      >
        {galleryForm}
      </AppDialog>
      <AppDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        title="Add trail service"
        description="Create shuttle, lift, or support vehicle details for a trail."
        maxWidthClassName="max-w-3xl"
      >
        {serviceForm}
      </AppDialog>
      <AppDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        title="Post trail update"
        description="Publish a trail builder or admin trail update."
        maxWidthClassName="max-w-xl"
      >
        {trailUpdateForm}
      </AppDialog>
      <AppDialog
        open={Boolean(deleteGalleryTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteGalleryTarget(null);
        }}
        title="Delete gallery item"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteGalleryTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">
                Delete {deleteGalleryTarget.caption || 'this gallery item'}?
              </p>
              <p className="mt-2 break-all text-xs leading-5">{deleteGalleryTarget.image_url}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteGalleryTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteGalleryMutation.mutate(deleteGalleryTarget)}
                disabled={deleteGalleryMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteGalleryMutation.isPending ? 'Deleting...' : 'Delete gallery item'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
      <AppDialog
        open={Boolean(deleteServiceTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteServiceTarget(null);
        }}
        title="Delete trail service"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteServiceTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Delete {deleteServiceTarget.title}?</p>
              <p className="mt-2 text-xs leading-5">
                This removes the service from trail service listings.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteServiceTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTrailServiceMutation.mutate(deleteServiceTarget.id)}
                disabled={deleteTrailServiceMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteTrailServiceMutation.isPending ? 'Deleting...' : 'Delete service'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
      <AppDialog
        open={Boolean(deleteUpdateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteUpdateTarget(null);
        }}
        title="Delete trail update"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteUpdateTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Delete {deleteUpdateTarget.title}?</p>
              <p className="mt-2 text-xs leading-5">
                This removes the update from the trail update log.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteUpdateTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTrailUpdateMutation.mutate(deleteUpdateTarget)}
                disabled={deleteTrailUpdateMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteTrailUpdateMutation.isPending ? 'Deleting...' : 'Delete update'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  );
}
