import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAdminOrganizations, type OrganizationOption } from '@/services/admin/admin.service';
import AppDialog from '@/components/ui/app-dialog';
import {
  getTrailUpdateTypeBadgeClass,
  trailUpdateTypeLabelByValue,
  TRAIL_UPDATE_TYPE_OPTIONS,
  type TrailUpdateType,
} from '@/lib/trail-updates';

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
  created_at: string;
};

type GalleryDraftItem = {
  id: string;
  fileName: string;
  imageUrl: string;
  title: string;
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

type TrailOrganizationRelationType = 'built_by' | 'verified_by' | 'maintained_by';

type TrailOrganizationAssignment = {
  id: string;
  trail_id: string;
  organization_id: string;
  relation_type: TrailOrganizationRelationType;
  is_primary: boolean;
  created_at: string;
  trail_name?: string | null;
  organization_name?: string | null;
  organization_slug?: string | null;
};

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
  media_urls?: string[] | null;
  created_at: string;
};

const UPDATE_TYPE_OPTIONS = TRAIL_UPDATE_TYPE_OPTIONS;

const RELATION_TYPE_OPTIONS: Array<{
  value: TrailOrganizationRelationType;
  label: string;
}> = [
  { value: 'built_by', label: 'Built by' },
  { value: 'maintained_by', label: 'Maintained by' },
  { value: 'verified_by', label: 'Verified by' },
];

const relationLabelByValue = RELATION_TYPE_OPTIONS.reduce<
  Record<TrailOrganizationRelationType, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {
  built_by: 'Built by',
  maintained_by: 'Maintained by',
  verified_by: 'Verified by',
});

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

function deriveGalleryTitle(sourceName: string) {
  const baseName = sourceName
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return baseName || 'Untitled image';
}

function extractImageNameFromUrl(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    const fileName = parsed.pathname.split('/').pop();
    if (!fileName) return '';
    return deriveGalleryTitle(decodeURIComponent(fileName));
  } catch {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return '';
    return deriveGalleryTitle(decodeURIComponent(fileName.split('?')[0].split('#')[0]));
  }
}

function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export default function OrganizationOpsPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [deleteGalleryTarget, setDeleteGalleryTarget] = useState<GalleryItem | null>(null);
  const [editGalleryTarget, setEditGalleryTarget] = useState<GalleryItem | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<TrailService | null>(null);
  const [deleteUpdateTarget, setDeleteUpdateTarget] = useState<TrailUpdate | null>(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<TrailOrganizationAssignment | null>(null);
  const [editUpdateTarget, setEditUpdateTarget] = useState<TrailUpdate | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedTrailId, setSelectedTrailId] = useState('');
  const [selectedUpdateOrgId, setSelectedUpdateOrgId] = useState('');
  const [assignmentTrailFilterId, setAssignmentTrailFilterId] = useState('');
  const [assignmentOrgFilterId, setAssignmentOrgFilterId] = useState('');
  const [assignmentTrailId, setAssignmentTrailId] = useState('');
  const [assignmentOrgId, setAssignmentOrgId] = useState('');
  const [assignmentRelationType, setAssignmentRelationType] =
    useState<TrailOrganizationRelationType>('built_by');
  const [assignmentIsPrimary, setAssignmentIsPrimary] = useState(false);
  const [updateType, setUpdateType] = useState<TrailUpdateType>('condition_update');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDetails, setUpdateDetails] = useState('');
  const [updateMediaUrls, setUpdateMediaUrls] = useState('');

  const [galleryDrafts, setGalleryDrafts] = useState<GalleryDraftItem[]>([]);
  const [editGalleryCaption, setEditGalleryCaption] = useState('');
  const [editGalleryImageUrl, setEditGalleryImageUrl] = useState('');
  const [serviceTrailFilterId, setServiceTrailFilterId] = useState('');
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
  const { data: trailOrganizationAssignments = [], refetch: refetchAssignments } = useQuery<
    TrailOrganizationAssignment[]
  >({
    queryKey: [
      'admin-trail-organization-assignments',
      assignmentTrailFilterId,
      assignmentOrgFilterId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (assignmentTrailFilterId) params.set('trail_id', assignmentTrailFilterId);
      if (assignmentOrgFilterId) params.set('organization_id', assignmentOrgFilterId);
      const response = await fetch(`/api/admin/trail-organizations?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch trail builder assignments');
      }
      return data?.assignments || [];
    },
  });
  const {
    data: trailServices = [],
    refetch: refetchTrailServices,
    isLoading: loadingTrailServices,
    error: trailServicesError,
  } = useQuery<TrailService[]>({
    queryKey: ['admin-trail-services', serviceTrailFilterId],
    queryFn: async () => {
      const params = new URLSearchParams({ include_inactive: 'true' });
      if (serviceTrailFilterId) params.set('trail_id', serviceTrailFilterId);
      const response = await fetch(`/api/admin/trail-services?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch trail services');
      }
      return data?.services || [];
    },
  });
  const { data: trailUpdates = [], refetch: refetchTrailUpdates } = useQuery<TrailUpdate[]>({
    queryKey: ['admin-trail-updates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/trail-updates');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch trail updates');
      }
      return data?.updates || [];
    },
  });

  const addGalleryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrgId) {
        throw new Error('Please select a trail builder.');
      }
      const responses = [];
      for (const draft of galleryDrafts) {
        const response = await fetch(`/api/organizations/${selectedOrgId}/gallery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: draft.imageUrl.trim(),
            caption: draft.title.trim() || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to add gallery item');
        }
        responses.push(data);
      }
      return responses;
    },
    onSuccess: async () => {
      await refetchGallery();
      setGalleryDrafts([]);
      setGalleryOpen(false);
      setMessage('Gallery item added.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to add gallery item.');
    },
  });

  const editGalleryMutation = useMutation({
    mutationFn: async () => {
      if (!editGalleryTarget) {
        throw new Error('No gallery item selected.');
      }
      const response = await fetch(
        `/api/organizations/${editGalleryTarget.organization_id}/gallery/${editGalleryTarget.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: editGalleryImageUrl.trim() || null,
            caption: editGalleryCaption.trim() || null,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update gallery item');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchGallery();
      setEditGalleryTarget(null);
      setEditGalleryCaption('');
      setEditGalleryImageUrl('');
      setMessage('Gallery item updated.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update gallery item.');
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

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/trail-organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trail_id: assignmentTrailId,
          organization_id: assignmentOrgId,
          relation_type: assignmentRelationType,
          is_primary: assignmentIsPrimary,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to assign trail builder');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchAssignments();
      setAssignmentTrailId('');
      setAssignmentOrgId('');
      setAssignmentRelationType('built_by');
      setAssignmentIsPrimary(false);
      setAssignmentOpen(false);
      setMessage('Trail builder assigned.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to assign trail builder.');
    },
  });

  const toggleAssignmentPrimaryMutation = useMutation({
    mutationFn: async ({
      id,
      is_primary,
    }: {
      id: string;
      is_primary: boolean;
    }) => {
      const response = await fetch(`/api/admin/trail-organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_primary }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update trail builder assignment');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchAssignments();
      setMessage('Trail builder assignment updated.');
    },
    onError: (error) => {
      setMessage(
        error instanceof Error ? error.message : 'Failed to update trail builder assignment.'
      );
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignment: TrailOrganizationAssignment) => {
      const response = await fetch(`/api/admin/trail-organizations/${assignment.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete trail builder assignment');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchAssignments();
      setDeleteAssignmentTarget(null);
      setMessage('Trail builder assignment deleted.');
    },
    onError: (error) => {
      setMessage(
        error instanceof Error ? error.message : 'Failed to delete trail builder assignment.'
      );
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
  const editUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!editUpdateTarget) throw new Error('No trail update selected.');
      const response = await fetch('/api/admin/trail-updates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editUpdateTarget.id,
          trail_id: selectedTrailId,
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
        throw new Error(data?.error || 'Failed to update trail update');
      }
      return data;
    },
    onSuccess: async () => {
      await refetchTrailUpdates();
      setEditUpdateTarget(null);
      setUpdateOpen(false);
      setUpdateTitle('');
      setUpdateDetails('');
      setUpdateMediaUrls('');
      setMessage('Trail update updated.');
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to update trail update.');
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

  const canAddGallery = Boolean(
    selectedOrgId &&
      galleryDrafts.length > 0 &&
      galleryDrafts.every((draft) => draft.imageUrl.trim())
  );
  const canSaveGalleryEdit = Boolean(editGalleryTarget);
  const canCreateAssignment = Boolean(assignmentTrailId && assignmentOrgId);
  const canPostUpdate = Boolean(selectedTrailId && updateTitle.trim());
  const canCreateService = Boolean(serviceTrailId && serviceTitle.trim());
  const isSavingUpdate = createUpdateMutation.isPending || editUpdateMutation.isPending;
  const togglingAssignmentId = toggleAssignmentPrimaryMutation.variables?.id;
  const deletingAssignmentId = deleteAssignmentMutation.variables?.id;
  const togglingServiceId = toggleTrailServiceMutation.variables?.id;
  const deletingGalleryId = deleteGalleryMutation.variables?.id;
  const deletingServiceId = deleteTrailServiceMutation.variables;
  const deletingUpdateId = deleteTrailUpdateMutation.variables?.id;
  const orgOptions = useMemo(
    () =>
      organizations
        .filter((org) => org.is_active)
        .map((org) => ({ value: org.id, label: org.name })),
    [organizations]
  );
  const fieldClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  const fullFieldClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  const secondaryButtonClass =
    'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
  const tableActionButtonClass =
    'inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
  const dangerActionButtonClass =
    'inline-flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70';
  const primarySlateButtonClass =
    'inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white';
  const primaryGreenButtonClass =
    'inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 dark:bg-green-500 dark:text-slate-950 dark:hover:bg-green-400';
  const primaryCyanButtonClass =
    'inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300';
  const primaryDangerButtonClass =
    'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:text-white dark:hover:bg-red-400';
  const smallSlateButtonClass =
    'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white';
  const smallGreenButtonClass =
    'rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 dark:bg-green-500 dark:text-slate-950 dark:hover:bg-green-400';
  const smallCyanButtonClass =
    'rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300';
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
  const resetTrailUpdateForm = () => {
    setEditUpdateTarget(null);
    setUpdateType('condition_update');
    setUpdateTitle('');
    setUpdateDetails('');
    setUpdateMediaUrls('');
  };
  const getUpdateMediaText = (update: TrailUpdate) =>
    Array.isArray(update.media_urls)
      ? update.media_urls
          .filter((value) => typeof value === 'string' && value.trim())
          .join('\n')
      : '';
  const openCreateUpdate = () => {
    resetTrailUpdateForm();
    setUpdateOpen(true);
  };
  const openEditUpdate = (update: TrailUpdate) => {
    setEditUpdateTarget(update);
    setSelectedTrailId(update.trail_id);
    setSelectedUpdateOrgId(update.organization_id || '');
    setUpdateType(update.update_type);
    setUpdateTitle(update.title);
    setUpdateDetails(update.details || '');
    setUpdateMediaUrls(getUpdateMediaText(update));
    setUpdateOpen(true);
  };
  const openEditGallery = (item: GalleryItem) => {
    setEditGalleryTarget(item);
    setEditGalleryCaption(item.caption || '');
    setEditGalleryImageUrl(item.image_url);
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
  const appendGalleryDrafts = async (files: FileList | null) => {
    if (!files?.length) return;
    const fileList = Array.from(files);
    try {
      const dataUrls = await Promise.all(fileList.map(readImageFileAsDataUrl));
      setGalleryDrafts((prev) => {
        const nextDrafts = dataUrls.map((imageUrl, index) => {
          const file = fileList[index];
          return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${index}`,
            fileName: file.name,
            imageUrl,
            title: deriveGalleryTitle(file.name),
          };
        });
        return [...prev, ...nextDrafts];
      });
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to upload images.');
    }
  };
  const updateGalleryDraft = (id: string, patch: Partial<GalleryDraftItem>) => {
    setGalleryDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  };
  const removeGalleryDraft = (id: string) => {
    setGalleryDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };
  const closeGalleryDialog = () => {
    setGalleryOpen(false);
    setGalleryDrafts([]);
  };
  const closeEditGalleryDialog = () => {
    setEditGalleryTarget(null);
    setEditGalleryCaption('');
    setEditGalleryImageUrl('');
  };

  const assignmentForm = (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={assignmentTrailId}
          onChange={(event) => setAssignmentTrailId(event.target.value)}
          className={fieldClass}
        >
          <option value="">Select trail</option>
          {trails.map((trail) => (
            <option key={trail.id} value={trail.id}>
              {trail.name}
            </option>
          ))}
        </select>
        <select
          value={assignmentOrgId}
          onChange={(event) => setAssignmentOrgId(event.target.value)}
          className={fieldClass}
        >
          <option value="">Select trail builder</option>
          {orgOptions.map((org) => (
            <option key={org.value} value={org.value}>
              {org.label}
            </option>
          ))}
        </select>
        <select
          value={assignmentRelationType}
          onChange={(event) =>
            setAssignmentRelationType(event.target.value as TrailOrganizationRelationType)
          }
          className={fieldClass}
        >
          {RELATION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={assignmentIsPrimary}
            onChange={(event) => setAssignmentIsPrimary(event.target.checked)}
          />
          Primary for this relation
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAssignmentOpen(false)}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createAssignmentMutation.mutate()}
          disabled={!canCreateAssignment || createAssignmentMutation.isPending}
          className={primarySlateButtonClass}
        >
          {createAssignmentMutation.isPending && <LoadingSpinner />}
          {createAssignmentMutation.isPending ? 'Assigning...' : 'Assign trail builder'}
        </button>
      </div>
    </div>
  );

  const galleryForm = (
    <div className="mt-5 space-y-4">
      <select
        value={selectedOrgId}
        onChange={(event) => setSelectedOrgId(event.target.value)}
        className={fullFieldClass}
      >
        <option value="">Select trail builder</option>
        {orgOptions.map((org) => (
          <option key={org.value} value={org.value}>
            {org.label}
          </option>
        ))}
      </select>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-green-300 bg-white p-4 text-center hover:bg-green-50 dark:border-green-900/70 dark:bg-slate-900 dark:hover:bg-green-950/30">
        <span className="text-sm font-semibold text-green-800 dark:text-green-200">
          Upload multiple images
        </span>
        <span className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          JPG, PNG, or WebP under 4MB each. Titles default from the file name.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={async (event) => {
            await appendGalleryDrafts(event.target.files);
            event.target.value = '';
          }}
          className="sr-only"
        />
      </label>
      {galleryDrafts.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Pending gallery items
            </p>
            <button
              type="button"
              onClick={() => setGalleryDrafts([])}
              className="text-xs font-semibold text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-3">
            {galleryDrafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-col gap-3 lg:flex-row">
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-slate-800">
                    <Image
                      src={draft.imageUrl}
                      alt={draft.title}
                      width={240}
                      height={160}
                      unoptimized
                      className="h-28 w-full object-cover lg:w-40"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                        Image title
                      </label>
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          updateGalleryDraft(draft.id, { title: event.target.value })
                        }
                        className={`mt-1 ${fullFieldClass}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                        File name
                      </label>
                      <p className="mt-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        {draft.fileName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start justify-end">
                    <button
                      type="button"
                      onClick={() => removeGalleryDraft(draft.id)}
                      className={dangerActionButtonClass}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Choose one or more image files to build the gallery queue.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={closeGalleryDialog}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => addGalleryMutation.mutate()}
          disabled={!canAddGallery || addGalleryMutation.isPending}
          className={primaryGreenButtonClass}
        >
          {addGalleryMutation.isPending && <LoadingSpinner />}
          {addGalleryMutation.isPending
            ? 'Adding...'
            : galleryDrafts.length > 1
              ? `Add ${galleryDrafts.length} gallery items`
              : 'Add gallery item'}
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
          className={fieldClass}
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
          className={fieldClass}
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
          className={fieldClass}
        >
          <option value="shuttle">Shuttle</option>
          <option value="lift">Lift</option>
          <option value="support_vehicle">Support vehicle</option>
        </select>
        <input
          value={serviceTitle}
          onChange={(event) => setServiceTitle(event.target.value)}
          placeholder="Service title"
          className={fieldClass}
        />
        <input
          value={serviceContactPhone}
          onChange={(event) => setServiceContactPhone(event.target.value)}
          placeholder="Phone (optional)"
          className={fieldClass}
        />
        <input
          value={serviceContactWhatsapp}
          onChange={(event) => setServiceContactWhatsapp(event.target.value)}
          placeholder="WhatsApp (optional)"
          className={fieldClass}
        />
        <input
          value={serviceContactEmail}
          onChange={(event) => setServiceContactEmail(event.target.value)}
          placeholder="Email (optional)"
          className={fieldClass}
        />
        <input
          value={servicePriceNote}
          onChange={(event) => setServicePriceNote(event.target.value)}
          placeholder="Price note"
          className={fieldClass}
        />
        <input
          value={serviceScheduleNote}
          onChange={(event) => setServiceScheduleNote(event.target.value)}
          placeholder="Schedule note"
          className={fieldClass}
        />
        <input
          value={serviceDescription}
          onChange={(event) => setServiceDescription(event.target.value)}
          placeholder="Description (optional)"
          className={`${fieldClass} md:col-span-2`}
        />
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-slate-200">
        <input
          type="checkbox"
          checked={serviceIsActive}
          onChange={(event) => setServiceIsActive(event.target.checked)}
        />
        Service is available
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setServiceOpen(false)}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createTrailServiceMutation.mutate()}
          disabled={!canCreateService || createTrailServiceMutation.isPending}
          className={primaryGreenButtonClass}
        >
          {createTrailServiceMutation.isPending && <LoadingSpinner />}
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
        className={fullFieldClass}
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
        className={fullFieldClass}
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
        className={fullFieldClass}
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
        className={fullFieldClass}
      />
      <textarea
        value={updateDetails}
        onChange={(event) => setUpdateDetails(event.target.value)}
        rows={3}
        placeholder="Update details"
        className={fullFieldClass}
      />
      <textarea
        value={updateMediaUrls}
        onChange={(event) => setUpdateMediaUrls(event.target.value)}
        rows={3}
        placeholder="Media URLs (one per line)"
        className={fullFieldClass}
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
          className={secondaryButtonClass}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            editUpdateTarget
              ? editUpdateMutation.mutate()
              : createUpdateMutation.mutate()
          }
          disabled={!canPostUpdate || isSavingUpdate}
          className={primaryCyanButtonClass}
        >
          {isSavingUpdate && <LoadingSpinner />}
          {editUpdateTarget
            ? editUpdateMutation.isPending
              ? 'Saving...'
              : 'Save trail update'
            : createUpdateMutation.isPending
              ? 'Posting...'
              : 'Post trail update'}
        </button>
      </div>
    </div>
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">Trail Builder Operations</h2>
      <p className="mb-5 text-sm text-gray-600 dark:text-slate-300">
        Manage trail builder gallery assets and publish trail update logs.
      </p>
      {message && (
        <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {message}
        </p>
      )}

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Trail Builder Assignments
              </h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                Link active trail builders to trails for builder, maintainer, and verifier roles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAssignmentOpen(true)}
              className={smallSlateButtonClass}
            >
              Assign trail builder
            </button>
          </div>
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <select
              value={assignmentTrailFilterId}
              onChange={(event) => setAssignmentTrailFilterId(event.target.value)}
              className={fieldClass}
            >
              <option value="">All trails</option>
              {trails.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.name}
                </option>
              ))}
            </select>
            <select
              value={assignmentOrgFilterId}
              onChange={(event) => setAssignmentOrgFilterId(event.target.value)}
              className={fieldClass}
            >
              <option value="">All trail builders</option>
              {orgOptions.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
          </div>
          {trailOrganizationAssignments.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No trail builder assignments found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="min-w-[950px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Trail</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Relation</th>
                    <th className="px-4 py-3">Primary</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                  {trailOrganizationAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-slate-100">
                        {assignment.trail_name || 'Unknown trail'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">
                          {assignment.organization_name || 'Unknown trail builder'}
                        </p>
                        {assignment.organization_slug && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            {assignment.organization_slug}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {relationLabelByValue[assignment.relation_type]}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                            assignment.is_primary
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {assignment.is_primary ? 'Primary' : 'Secondary'}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleAssignmentPrimaryMutation.mutate({
                                id: assignment.id,
                                is_primary: !assignment.is_primary,
                              })
                            }
                            disabled={toggleAssignmentPrimaryMutation.isPending}
                            className={tableActionButtonClass}
                          >
                            {togglingAssignmentId === assignment.id && <LoadingSpinner />}
                            {togglingAssignmentId === assignment.id
                              ? 'Saving...'
                              : assignment.is_primary
                                ? 'Make secondary'
                                : 'Make primary'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteAssignmentTarget(assignment)}
                            disabled={deleteAssignmentMutation.isPending}
                            className={dangerActionButtonClass}
                          >
                            {deletingAssignmentId === assignment.id && <LoadingSpinner />}
                            {deletingAssignmentId === assignment.id ? 'Deleting...' : 'Delete'}
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

        <section className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Trail Builder Gallery</h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">Gallery assets grouped by trail builder.</p>
            </div>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className={smallGreenButtonClass}
            >
              Add gallery item
            </button>
          </div>
          <div className="mb-3 max-w-sm">
            <select
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className={fullFieldClass}
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
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No gallery items found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="min-w-[780px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                  {galleryItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url}
                            alt={item.caption || extractImageNameFromUrl(item.image_url) || 'Trail builder gallery image'}
                            className="h-14 w-20 rounded-lg bg-gray-100 object-cover"
                          />
                          <div className="min-w-0">
                            <p
                              className="max-w-[260px] truncate font-semibold text-gray-900 dark:text-slate-100"
                              title={
                                item.caption ||
                                extractImageNameFromUrl(item.image_url) ||
                                'Untitled image'
                              }
                            >
                              {item.caption ||
                                extractImageNameFromUrl(item.image_url) ||
                                'Untitled image'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {item.organization_name || 'Unknown trail builder'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditGallery(item)}
                            className={tableActionButtonClass}
                          >
                            Edit
                          </button>
                          <a
                            href={item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className={tableActionButtonClass}
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => setDeleteGalleryTarget(item)}
                            disabled={deleteGalleryMutation.isPending}
                            className={dangerActionButtonClass}
                          >
                            {deletingGalleryId === item.id && <LoadingSpinner />}
                            {deletingGalleryId === item.id ? 'Deleting...' : 'Delete'}
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

        <section className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Trail Services</h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">Shuttle, lift, and support vehicle options.</p>
            </div>
            <button
              type="button"
              onClick={() => setServiceOpen(true)}
              className={smallGreenButtonClass}
            >
              Add trail service
            </button>
          </div>
          <div className="mb-3 max-w-sm">
            <select
              value={serviceTrailFilterId}
              onChange={(event) => setServiceTrailFilterId(event.target.value)}
              className={fullFieldClass}
            >
              <option value="">All trails</option>
              {trails.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.name}
                </option>
              ))}
            </select>
          </div>
          {loadingTrailServices ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <LoadingSpinner />
              Loading trail services...
            </p>
          ) : trailServicesError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
              {trailServicesError instanceof Error
                ? trailServicesError.message
                : 'Failed to load trail services.'}
            </p>
          ) : trailServices.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No trail services found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Trail</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                  {trailServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-gray-900 dark:text-slate-100">
                          {service.title} · {service.service_type.replace('_', ' ')}
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-gray-600 dark:text-slate-300">
                          {service.price_note || service.schedule_note || service.description || 'No notes'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {service.trail_name || 'Unknown trail'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {service.organization_name || 'No trail builder'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
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
                          {service.is_active ? 'Available' : 'Out of service'}
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
                            className={tableActionButtonClass}
                          >
                            {togglingServiceId === service.id && <LoadingSpinner />}
                            {togglingServiceId === service.id
                              ? 'Saving...'
                              : service.is_active
                                ? 'Mark out'
                                : 'Mark available'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteServiceTarget(service)}
                            disabled={deleteTrailServiceMutation.isPending}
                            className={dangerActionButtonClass}
                          >
                            {deletingServiceId === service.id && <LoadingSpinner />}
                            {deletingServiceId === service.id ? 'Deleting...' : 'Delete'}
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

        <section className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Trail Updates</h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">Condition, maintenance, route, and hazard updates.</p>
            </div>
            <button
              type="button"
              onClick={openCreateUpdate}
              className={smallCyanButtonClass}
            >
              Post trail update
            </button>
          </div>
          {trailUpdates.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No trail updates found.
            </p>
          ) : (
            <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="min-w-[950px] w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Update</th>
                    <th className="px-4 py-3">Trail</th>
                    <th className="px-4 py-3">Trail Builder</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                  {trailUpdates.map((update) => (
                    <tr key={update.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="flex max-w-sm flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            {update.title}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getTrailUpdateTypeBadgeClass(update.update_type)}`}
                          >
                            {trailUpdateTypeLabelByValue[update.update_type]}
                          </span>
                        </div>
                        {update.details && (
                          <p className="mt-1 max-w-xs text-xs text-gray-600 dark:text-slate-300">{update.details}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {update.trail_name || 'Unknown trail'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {update.organization_name || 'No trail builder'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {update.actor_name || 'System'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                        {new Date(update.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditUpdate(update)}
                            disabled={isSavingUpdate}
                            className={tableActionButtonClass}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteUpdateTarget(update)}
                            disabled={deleteTrailUpdateMutation.isPending}
                            className={dangerActionButtonClass}
                          >
                            {deletingUpdateId === update.id && <LoadingSpinner />}
                            {deletingUpdateId === update.id ? 'Deleting...' : 'Delete'}
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
        open={assignmentOpen}
        onOpenChange={setAssignmentOpen}
        title="Assign trail builder"
        description="Connect a trail builder organization to a trail."
        maxWidthClassName="max-w-2xl"
      >
        {assignmentForm}
      </AppDialog>
      <AppDialog
        open={galleryOpen}
        onOpenChange={(open) => {
          setGalleryOpen(open);
          if (!open) {
            setGalleryDrafts([]);
          }
        }}
        title="Add gallery item"
        description="Add a public trail builder gallery image."
        maxWidthClassName="max-w-xl"
      >
        {galleryForm}
      </AppDialog>
      <AppDialog
        open={Boolean(editGalleryTarget)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditGalleryDialog();
          }
        }}
        title="Edit gallery item"
        description="Update the gallery image title and order."
        maxWidthClassName="max-w-xl"
      >
        {editGalleryTarget && (
          <div className="mt-5 space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editGalleryImageUrl || editGalleryTarget.image_url}
                alt={editGalleryCaption || editGalleryTarget.caption || 'Trail builder gallery image'}
                className="h-48 w-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                  Image title
                </label>
                <input
                  value={editGalleryCaption}
                  onChange={(event) => setEditGalleryCaption(event.target.value)}
                  className={`mt-1 ${fullFieldClass}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                  Image URL
                </label>
                <input
                  value={editGalleryImageUrl}
                  onChange={(event) => setEditGalleryImageUrl(event.target.value)}
                  className={`mt-1 ${fullFieldClass}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  closeEditGalleryDialog();
                }}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => editGalleryMutation.mutate()}
                disabled={!canSaveGalleryEdit || editGalleryMutation.isPending}
                className={primaryGreenButtonClass}
              >
                {editGalleryMutation.isPending && <LoadingSpinner />}
                {editGalleryMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
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
        onOpenChange={(open) => {
          setUpdateOpen(open);
          if (!open) resetTrailUpdateForm();
        }}
        title={editUpdateTarget ? 'Edit trail update' : 'Post trail update'}
        description={
          editUpdateTarget
            ? 'Update the trail update details.'
            : 'Publish a trail builder or admin trail update.'
        }
        maxWidthClassName="max-w-xl"
      >
        {trailUpdateForm}
      </AppDialog>
      <AppDialog
        open={Boolean(deleteAssignmentTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteAssignmentTarget(null);
        }}
        title="Delete trail builder assignment"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteAssignmentTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">
                Remove {deleteAssignmentTarget.organization_name || 'this trail builder'} from{' '}
                {deleteAssignmentTarget.trail_name || 'this trail'}?
              </p>
              <p className="mt-2 text-xs leading-5">
                This removes the builder relation used by trail detail pages and trail builder
                operations access.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAssignmentTarget(null)}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteAssignmentMutation.mutate(deleteAssignmentTarget)}
                disabled={deleteAssignmentMutation.isPending}
                className={primaryDangerButtonClass}
              >
                {deleteAssignmentMutation.isPending && <LoadingSpinner />}
                {deleteAssignmentMutation.isPending ? 'Deleting...' : 'Delete assignment'}
              </button>
            </div>
          </div>
        )}
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
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteGalleryMutation.mutate(deleteGalleryTarget)}
                disabled={deleteGalleryMutation.isPending}
                className={primaryDangerButtonClass}
              >
                {deleteGalleryMutation.isPending && <LoadingSpinner />}
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
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTrailServiceMutation.mutate(deleteServiceTarget.id)}
                disabled={deleteTrailServiceMutation.isPending}
                className={primaryDangerButtonClass}
              >
                {deleteTrailServiceMutation.isPending && <LoadingSpinner />}
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
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTrailUpdateMutation.mutate(deleteUpdateTarget)}
                disabled={deleteTrailUpdateMutation.isPending}
                className={primaryDangerButtonClass}
              >
                {deleteTrailUpdateMutation.isPending && <LoadingSpinner />}
                {deleteTrailUpdateMutation.isPending ? 'Deleting...' : 'Delete update'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  );
}
