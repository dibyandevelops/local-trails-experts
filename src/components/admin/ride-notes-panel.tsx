'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppDialog from '@/components/ui/app-dialog';
import { resizeImageToDataUrl } from '@/lib/image';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import {
  createAdminRideNote,
  deleteAdminRideNote,
  fetchAdminRideNotes,
  updateAdminRideNote,
  type AdminRideNote,
  type AdminRideNoteCategory,
  type AdminRideNoteInput,
} from '@/services/admin/admin.service';

const categories: Array<{ value: AdminRideNoteCategory; label: string }> = [
  { value: 'trail_guide', label: 'Trail guide' },
  { value: 'expert_note', label: 'Expert note' },
  { value: 'ride_report', label: 'Ride report' },
  { value: 'safety', label: 'Safety' },
  { value: 'trail_work', label: 'Trail work' },
  { value: 'ride_note', label: 'Ride note' },
];

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

function StatusBadge({ status }: { status: AdminRideNote['status'] }) {
  const statusConfig: Record<AdminRideNote['status'], { label: string; className: string }> = {
    draft: {
      label: 'Draft',
      className:
        'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    },
    pending_review: {
      label: 'Pending review',
      className:
        'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200',
    },
    published: {
      label: 'Published',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    },
    rejected: {
      label: 'Rejected',
      className:
        'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
    },
  };
  const config = statusConfig[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return 'Not published';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not published';
  return date.toLocaleDateString('en-NP', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDefaultValues(note?: AdminRideNote | null): AdminRideNoteInput {
  return {
    title: note?.title || '',
    excerpt: note?.excerpt || '',
    content: note?.content || '',
    cover_image_url: note?.cover_image_url || '',
    category: note?.category || 'ride_note',
    status: note?.status || 'draft',
    trail_id: note?.trail_id || '',
    expert_user_id: note?.expert_user_id || '',
    organization_id: note?.organization_id || '',
  };
}

export default function RideNotesPanel() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AdminRideNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRideNote | null>(null);
  const [message, setMessage] = useState('');
  const [editorMessage, setEditorMessage] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdminRideNoteInput>({
    defaultValues: getDefaultValues(),
  });
  const coverImageUrl = watch('cover_image_url');
  const selectedCategory = watch('category');
  const usesExpertContext = ['trail_guide', 'expert_note', 'ride_report'].includes(selectedCategory);
  const usesOrganizationContext = ['safety', 'trail_work'].includes(selectedCategory);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.admin.rideNotes,
    queryFn: fetchAdminRideNotes,
  });

  const notes = data?.notes || [];
  const trails = data?.trails || [];
  const experts = data?.experts || [];
  const organizations = data?.organizations || [];

  const invalidateNotes = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.rideNotes });
  };

  const createMutation = useMutation({
    mutationFn: createAdminRideNote,
    onSuccess: async () => {
      setMessage('Ride note created.');
      setEditorOpen(false);
      reset(getDefaultValues());
      await invalidateNotes();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminRideNote,
    onSuccess: async () => {
      setMessage('Ride note updated.');
      setEditorOpen(false);
      setEditingNote(null);
      reset(getDefaultValues());
      await invalidateNotes();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (note: AdminRideNote) => deleteAdminRideNote(note.id),
    onSuccess: async (note) => {
      setMessage(`${note.title} deleted.`);
      setDeleteTarget(null);
      await invalidateNotes();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  const publishedCount = useMemo(
    () => notes.filter((note) => note.status === 'published').length,
    [notes]
  );
  const pendingReviewCount = useMemo(
    () => notes.filter((note) => note.status === 'pending_review').length,
    [notes]
  );

  const openCreate = () => {
    setEditingNote(null);
    reset(getDefaultValues());
    setMessage('');
    setEditorMessage('');
    createMutation.reset();
    updateMutation.reset();
    setEditorOpen(true);
  };

  const openEdit = (note: AdminRideNote) => {
    setEditingNote(note);
    reset(getDefaultValues(note));
    setMessage('');
    setEditorMessage('');
    createMutation.reset();
    updateMutation.reset();
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingNote(null);
    setEditorMessage('');
    createMutation.reset();
    updateMutation.reset();
  };

  const onSubmit = (values: AdminRideNoteInput) => {
    const payload = {
      ...values,
      excerpt: values.excerpt?.trim() || '',
      cover_image_url: values.cover_image_url?.trim() || '',
      trail_id: values.trail_id || '',
      expert_user_id: usesExpertContext ? values.expert_user_id || '' : '',
      organization_id: usesOrganizationContext ? values.organization_id || '' : '',
    };

    if (editingNote) {
      updateMutation.mutate({ ...payload, id: editingNote.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditorMessage('Please upload a valid image file for the cover.');
      return;
    }

    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 1400, quality: 0.84 });
      if (dataUrl.length > 650_000) {
        setEditorMessage('Cover image is too large. Please choose a smaller image.');
        return;
      }
      setValue('cover_image_url', dataUrl, { shouldDirty: true });
      setEditorMessage('Cover image uploaded.');
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : 'Failed to upload cover image.');
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:rounded-2xl sm:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ride Notes</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Publish trail guides, expert notes, ride reports, safety updates, and trail work stories.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {pendingReviewCount} pending review / {publishedCount} published / {notes.length} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ride-notes"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          >
            Public page
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
          >
            Create note
          </button>
        </div>
      </div>

      {message && <p role="status" className="mb-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-300">
          {error instanceof Error ? error.message : 'Unable to load ride notes.'}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">Loading ride notes...</p>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No ride notes yet. Create the first note to make the public page useful.
        </p>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {notes.map((note) => (
            <article key={note.id} className="rounded-xl border border-gray-200 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-gray-900 dark:text-slate-100">{note.title}</h3>
                  <p className="mt-1 break-all text-xs text-gray-500 dark:text-slate-400">/{note.slug}</p>
                </div>
                <StatusBadge status={note.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-slate-400">Trail</dt>
                  <dd className="mt-0.5 text-gray-700 dark:text-slate-200">{note.trail_name || 'Not linked'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-slate-400">Published</dt>
                  <dd className="mt-0.5 text-gray-700 dark:text-slate-200">{formatDate(note.published_at)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold text-gray-500 dark:text-slate-400">Owner</dt>
                  <dd className="mt-0.5 text-gray-700 dark:text-slate-200">
                    {note.expert_name || note.organization_name || 'Not linked'}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(note)}
                  className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(note)}
                  className="min-h-10 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 md:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Context</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id} className="border-t border-gray-200 dark:border-slate-700">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{note.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">/{note.slug}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                    <p>{note.trail_name ? `Trail: ${note.trail_name}` : 'No trail linked'}</p>
                    <p>
                      {note.expert_name
                        ? `Expert: ${note.expert_name}`
                        : note.organization_name
                          ? `Organization: ${note.organization_name}`
                          : 'No owner linked'}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={note.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                    {formatDate(note.published_at)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(note)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(note)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
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
        </>
      )}

      <AppDialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (open) setEditorOpen(true);
          else closeEditor();
        }}
        title={editingNote ? 'Edit ride note' : 'Create ride note'}
        description="Connect the note to a trail and expert when it helps riders understand the route."
        maxWidthClassName="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="ride-note-title" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Title</label>
            <input
              id="ride-note-title"
              {...register('title', { required: 'Title is required.' })}
              className={inputClass}
              placeholder="Riding Pharping after rain"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ride-note-category" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Category</label>
              <select id="ride-note-category" {...register('category')} className={inputClass}>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ride-note-status" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Status</label>
              <select id="ride-note-status" {...register('status')} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending review</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ride-note-excerpt" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Excerpt</label>
            <textarea
              id="ride-note-excerpt"
              {...register('excerpt')}
              rows={2}
              className={inputClass}
              placeholder="Short summary shown on the Ride Notes page."
            />
          </div>

          <div>
            <label htmlFor="ride-note-content" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Content</label>
            <textarea
              id="ride-note-content"
              {...register('content', { required: 'Content is required.' })}
              rows={9}
              className={inputClass}
              placeholder="Write the note. Separate paragraphs with a blank line."
            />
            {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>}
          </div>

          <div>
            <label htmlFor="ride-note-cover-url" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Cover image URL</label>
            <div className="mt-1 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <input
                id="ride-note-cover-url"
                {...register('cover_image_url')}
                className={inputClass}
                placeholder="https://... or upload an image"
              />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                Upload cover
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-label="Upload ride note cover image"
                  onChange={(event) => {
                    void handleCoverUpload(event.target.files?.[0] || null);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            {coverImageUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="Ride note cover preview"
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setValue('cover_image_url', '', { shouldDirty: true })}
                  className="w-full bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Remove cover
                </button>
              </div>
            ) : null}
            {editorMessage && (
              <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                {editorMessage}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ride-note-trail" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Related trail</label>
              <select id="ride-note-trail" {...register('trail_id')} className={inputClass}>
                <option value="">No trail</option>
                {trails.map((trail) => (
                  <option key={trail.id} value={trail.id}>
                    {trail.name} {trail.location ? `- ${trail.location}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {usesOrganizationContext ? (
                <>
                  <label htmlFor="ride-note-organization" className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Related organization
                  </label>
                  <select id="ride-note-organization" {...register('organization_id')} className={inputClass}>
                    <option value="">No organization</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name} {organization.city ? `- ${organization.city}` : ''}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor="ride-note-expert" className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Related expert
                  </label>
                  <select id="ride-note-expert" {...register('expert_user_id')} className={inputClass} disabled={!usesExpertContext}>
                    <option value="">No expert</option>
                    {experts.map((expert) => (
                      <option key={expert.id} value={expert.id}>
                        {expert.name || expert.email} {expert.city ? `- ${expert.city}` : ''}
                      </option>
                    ))}
                  </select>
                  {!usesExpertContext && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      This category does not need an expert or organization.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {mutationError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {mutationError instanceof Error ? mutationError.message : 'Unable to save ride note.'}
            </p>
          )}

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:-mx-5 sm:flex-row sm:justify-end sm:px-5">
            <button
              type="button"
              onClick={closeEditor}
              className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {isSaving ? 'Saving...' : editingNote ? 'Update note' : 'Create note'}
            </button>
          </div>
        </form>
      </AppDialog>

      <AppDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete ride note"
        description="This removes the note from the public Ride Notes page and any related trail page."
      >
        {deleteTarget && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              Delete <span className="font-semibold text-gray-950 dark:text-white">{deleteTarget.title}</span>?
            </p>
            {deleteMutation.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Unable to delete ride note.'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete note'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  );
}
