'use client';

import { useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppDialog from '@/components/ui/app-dialog';
import { resizeImageToDataUrl } from '@/lib/image';

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

type PendingImage = {
  image_url: string;
  caption: string;
};

const MAX_BATCH_SIZE = 3;
const MAX_GALLERY_ITEMS = 10;
const MAX_IMAGE_LENGTH = 500_000;

async function galleryRequest<T>(organizationId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/organizations/${organizationId}/gallery`, {
    cache: 'no-store',
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Gallery request failed.');
  return data;
}

export default function OrganizationGalleryManagementPanel({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['builder-gallery', organizationId] as const;
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const query = useQuery({
    queryKey,
    queryFn: () => galleryRequest<{ items: GalleryItem[] }>(organizationId),
    enabled: Boolean(organizationId),
  });
  const items = query.data?.items || [];
  const remainingSlots = Math.max(0, MAX_GALLERY_ITEMS - items.length);

  const upload = useMutation({
    mutationFn: () => galleryRequest(organizationId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pendingImages }),
    }),
    onSuccess: async () => {
      setPendingImages([]);
      setMessage('Gallery images uploaded.');
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setMessage(error.message),
  });

  const remove = useMutation({
    mutationFn: async (item: GalleryItem) => {
      const response = await fetch(`/api/organizations/${organizationId}/gallery/${item.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to delete image.');
      return data;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      setMessage('Gallery image removed.');
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setMessage(error.message),
  });

  const selectFiles = async (files: File[]) => {
    setMessage('');
    if (files.length > MAX_BATCH_SIZE) {
      setMessage(`Select no more than ${MAX_BATCH_SIZE} images at a time.`);
      return;
    }
    if (files.length > remainingSlots) {
      setMessage(`Only ${remainingSlots} gallery slot${remainingSlots === 1 ? '' : 's'} remaining.`);
      return;
    }
    if (files.some((file) => !file.type.startsWith('image/'))) {
      setMessage('Every selected file must be an image.');
      return;
    }
    setProcessing(true);
    try {
      const processed = await Promise.all(
        files.map(async (file) => {
          const imageUrl = await resizeImageToDataUrl(file, { maxDimension: 1200, quality: 0.8 });
          if (imageUrl.length > MAX_IMAGE_LENGTH) {
            throw new Error(`${file.name} is too large after resizing.`);
          }
          return {
            image_url: imageUrl,
            caption: file.name.replace(/\.[^.]+$/, '').slice(0, 160),
          };
        })
      );
      setPendingImages(processed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to process selected images.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gallery</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Upload up to three images at once. Keep up to ten images total.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-200">{items.length}/{MAX_GALLERY_ITEMS}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ${remainingSlots === 0 ? 'pointer-events-none opacity-50' : ''}`}>
          <ImagePlus className="h-4 w-4" />
          {processing ? 'Processing...' : 'Choose images'}
          <input type="file" accept="image/*" multiple disabled={processing || remainingSlots === 0} className="hidden" onChange={(event) => { void selectFiles(Array.from(event.target.files || [])); event.currentTarget.value = ''; }} />
        </label>
        {pendingImages.length > 0 && (
          <button type="button" onClick={() => upload.mutate()} disabled={upload.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">
            {upload.isPending ? 'Uploading...' : `Upload ${pendingImages.length} image${pendingImages.length === 1 ? '' : 's'}`}
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-gray-700 dark:text-slate-300">{message}</p>}

      {pendingImages.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {pendingImages.map((image, index) => (
            <div key={`${image.caption}-${index}`} className="overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-900">
              <img src={image.image_url} alt="Upload preview" className="h-28 w-full object-cover" />
              <input value={image.caption} maxLength={160} onChange={(event) => setPendingImages((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, caption: event.target.value } : entry))} className="w-full border-t border-gray-200 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label={`Caption for image ${index + 1}`} />
            </div>
          ))}
        </div>
      )}

      {query.isLoading ? <p className="mt-5 text-sm text-gray-500">Loading gallery...</p> : (
        <div className="mt-5 grid max-h-[440px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <img src={item.image_url} alt={item.caption || 'Organization gallery image'} className="h-36 w-full bg-gray-100 object-cover dark:bg-slate-800" />
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.caption || 'Gallery image'}</p>
                <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300" aria-label={`Delete ${item.caption || 'gallery image'}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AppDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Remove gallery image" description="This image will be removed from the organization gallery.">
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-slate-700 dark:text-slate-200">Cancel</button><button type="button" disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{remove.isPending ? 'Removing...' : 'Remove image'}</button></div>
      </AppDialog>
    </section>
  );
}
