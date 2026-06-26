'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AppDialog from '@/components/ui/app-dialog';
import { resizeImageToDataUrl } from '@/lib/image';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import type {
  AdminRideNote,
  AdminRideNoteCategory,
} from '@/services/admin/admin.service';
import {
  createExpertRideNote,
  deleteExpertRideNote,
  fetchExpertRideNotes,
  updateExpertRideNote,
  type ExpertRideNoteInput,
} from '@/services/experts/ride-notes.service';

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

function getDefaultValues(note?: AdminRideNote | null): ExpertRideNoteInput {
  return {
    title: note?.title || '',
    excerpt: note?.excerpt || '',
    content: note?.content || '',
    cover_image_url: note?.cover_image_url || '',
    category: note?.category || 'expert_note',
    status: note?.status === 'pending_review' ? 'pending_review' : 'draft',
    trail_id: note?.trail_id || '',
    expert_user_id: '',
  };
}

function StatusBadge({ status }: { status: AdminRideNote['status'] }) {
  const statusConfig: Record<
    AdminRideNote['status'],
    { label: string; className: string }
  > = {
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
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return 'Not published';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not published';
  return date.toLocaleDateString('en-NP', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExpertRideNotesPanel() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AdminRideNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRideNote | null>(null);
  const [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpertRideNoteInput>({ defaultValues: getDefaultValues() });
  const coverImageUrl = watch('cover_image_url');

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.experts.myRideNotes,
    queryFn: fetchExpertRideNotes,
  });
  const notes = data?.notes || [];
  const trails = data?.trails || [];
  const publishedCount = useMemo(
    () => notes.filter((note) => note.status === 'published').length,
    [notes],
  );
  const pendingReviewCount = useMemo(
    () => notes.filter((note) => note.status === 'pending_review').length,
    [notes],
  );

  const invalidateNotes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.experts.myRideNotes,
      }),
      queryClient.invalidateQueries({ queryKey: ['ride-notes'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createExpertRideNote,
    onSuccess: async () => {
      setMessage('Ride note created.');
      setEditorOpen(false);
      reset(getDefaultValues());
      await invalidateNotes();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateExpertRideNote,
    onSuccess: async () => {
      setMessage('Ride note updated.');
      setEditorOpen(false);
      setEditingNote(null);
      reset(getDefaultValues());
      await invalidateNotes();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (note: AdminRideNote) => deleteExpertRideNote(note.id),
    onSuccess: async (note) => {
      setMessage(`${note.title} deleted.`);
      setDeleteTarget(null);
      await invalidateNotes();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  const openCreate = () => {
    setEditingNote(null);
    reset(getDefaultValues());
    setMessage('');
    setEditorOpen(true);
  };

  const openEdit = (note: AdminRideNote) => {
    setEditingNote(note);
    reset(getDefaultValues(note));
    setMessage('');
    setEditorOpen(true);
  };

  const onSubmit = (values: ExpertRideNoteInput) => {
    const payload = {
      ...values,
      excerpt: values.excerpt?.trim() || '',
      cover_image_url: values.cover_image_url?.trim() || '',
      trail_id: values.trail_id || '',
      expert_user_id: '',
    };
    if (editingNote) updateMutation.mutate({ ...payload, id: editingNote.id });
    else createMutation.mutate(payload);
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please upload a valid image file for the cover.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, {
        maxDimension: 1400,
        quality: 0.84,
      });
      if (dataUrl.length > 650_000) {
        setMessage('Cover image is too large. Please choose a smaller image.');
        return;
      }
      setValue('cover_image_url', dataUrl, { shouldDirty: true });
      setMessage('Cover image uploaded.');
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : 'Failed to upload cover image.',
      );
    }
  };

  return (
    <section id="ride-notes" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ride Notes
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Write trail guides, ride reports, safety notes, and local context
            from trails associated with you. Submitted notes go live after admin
            approval.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {pendingReviewCount} pending review / {publishedCount} published /{' '}
            {notes.length} total
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

      {message && (
        <p className="mb-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-300">
          {error instanceof Error
            ? error.message
            : 'Unable to load ride notes.'}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Loading ride notes...
        </p>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-700 dark:text-slate-300">
          No ride notes yet. Create your first note after associating at least
          one trail.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Trail</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => {
                const isPublished = note.status === 'published';
                return (
                  <tr
                    key={note.id}
                    className="border-t border-gray-200 dark:border-slate-700"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900 dark:text-slate-100">
                        {note.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        /{note.slug}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                      {note.trail_name || 'No trail linked'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={note.status} />
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">
                      {formatDate(note.published_at)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {isPublished ? (
                          <span className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-200">
                            Admin controlled
                          </span>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AppDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editingNote ? 'Edit ride note' : 'Create ride note'}
        description="Link the note to one of your associated trails when it helps riders understand the route."
        maxWidthClassName="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
              Title
            </label>
            <input
              {...register('title', { required: 'Title is required.' })}
              className={inputClass}
              placeholder="Riding Hattiban after rain"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">
                {errors.title.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                Category
              </label>
              <select {...register('category')} className={inputClass}>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                Status
              </label>
              <select {...register('status')} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="pending_review">Submit for review</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
              Related trail
            </label>
            <select {...register('trail_id')} className={inputClass}>
              <option value="">No trail</option>
              {trails.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.name} {trail.location ? `- ${trail.location}` : ''}
                </option>
              ))}
            </select>
            {trails.length === 0 && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Associate trails first to link notes to a route.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
              Excerpt
            </label>
            <textarea
              {...register('excerpt')}
              rows={2}
              className={inputClass}
              placeholder="Short summary shown on Ride Notes."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
              Content
            </label>
            <textarea
              {...register('content', { required: 'Content is required.' })}
              rows={9}
              className={inputClass}
              placeholder="Write the note. Separate paragraphs with a blank line."
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-600">
                {errors.content.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
              Cover image URL
            </label>
            <div className="mt-1 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <input
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
                  onClick={() =>
                    setValue('cover_image_url', '', { shouldDirty: true })
                  }
                  className="w-full bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Remove cover
                </button>
              </div>
            ) : null}
          </div>
          {mutationError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {mutationError instanceof Error
                ? mutationError.message
                : 'Unable to save ride note.'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {isSaving
                ? 'Saving...'
                : editingNote
                  ? 'Update note'
                  : 'Create note'}
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
              Delete{' '}
              <span className="font-semibold text-gray-950 dark:text-white">
                {deleteTarget.title}
              </span>
              ?
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
