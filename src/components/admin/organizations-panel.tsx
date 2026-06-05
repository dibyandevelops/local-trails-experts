import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  createAdminOrganization,
  deleteAdminOrganization,
  fetchAdminOrganizations,
  updateAdminOrganization,
  type OrganizationOption,
} from '@/services/admin/admin.service';
import AppDialog from '@/components/ui/app-dialog';
import { resizeImageToDataUrl } from '@/lib/image';

type OrganizationForm = {
  slug: string;
  name: string;
  tagline: string;
  city: string;
  country: string;
  logo_url: string;
  website_url: string;
  contact_email: string;
  contact_phone: string;
  is_verified: boolean;
  is_active: boolean;
};

const emptyForm: OrganizationForm = {
  slug: '',
  name: '',
  tagline: '',
  city: '',
  country: 'Nepal',
  logo_url: '',
  website_url: '',
  contact_email: '',
  contact_phone: '',
  is_verified: false,
  is_active: true,
};

function OrganizationVisibilityBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {isActive ? 'Visible' : 'Hidden'}
    </span>
  );
}

export default function OrganizationsPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [deleteTarget, setDeleteTarget] = useState<OrganizationOption | null>(null);
  const [logoUploadPending, setLogoUploadPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrganizationForm>({
    defaultValues: emptyForm,
  });
  const form = watch();

  const { data: organizations = [] } = useQuery<OrganizationOption[]>({
    queryKey: ['admin-organizations'],
    queryFn: fetchAdminOrganizations,
  });

  const invalidateOrganizations = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
  };

  const createMutation = useMutation({
    mutationFn: (values: OrganizationForm) => createAdminOrganization(values),
    onSuccess: async () => {
      await invalidateOrganizations();
      setMessage('Trail builder created.');
      reset(emptyForm);
      setSelectedOrganizationId('');
      setFormOpen(false);
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to create trail builder.'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: OrganizationForm) => updateAdminOrganization(selectedOrganizationId, values),
    onSuccess: async () => {
      await invalidateOrganizations();
      setMessage('Trail builder updated.');
      setFormOpen(false);
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to update trail builder.'),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminOrganization(id, { is_active: isActive }),
    onSuccess: async (organization) => {
      await invalidateOrganizations();
      setMessage(
        organization.is_active
          ? 'Trail builder is visible on public pages.'
          : 'Trail builder hidden from public pages.'
      );
      if (organization.id === selectedOrganizationId) {
        setValue('is_active', organization.is_active);
      }
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to update visibility.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (organization: OrganizationOption) => deleteAdminOrganization(organization.id),
    onSuccess: async (organization) => {
      await invalidateOrganizations();
      setMessage(`${organization.name} deleted.`);
      setDeleteTarget(null);
      if (organization.id === selectedOrganizationId) {
        setSelectedOrganizationId('');
        reset(emptyForm);
      }
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to delete trail builder.'),
  });

  const hydrateOrganizationForm = (org: OrganizationOption) => {
    reset({
      slug: org.slug || '',
      name: org.name || '',
      tagline: org.tagline || '',
      city: org.city || '',
      country: org.country || 'Nepal',
      logo_url: org.logo_url || '',
      website_url: org.website_url || '',
      contact_email: org.contact_email || '',
      contact_phone: org.contact_phone || '',
      is_verified: org.is_verified,
      is_active: org.is_active,
    });
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please upload a valid image file for the trail builder logo.');
      return;
    }
    setLogoUploadPending(true);
    setMessage(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 512, quality: 0.86 });
      setValue('logo_url', dataUrl, { shouldDirty: true });
    } catch {
      setMessage('Failed to process trail builder logo.');
    } finally {
      setLogoUploadPending(false);
    }
  };

  const openCreate = () => {
    setSelectedOrganizationId('');
    reset(emptyForm);
    setFormMode('create');
    setFormOpen(true);
  };

  const openEditForOrganization = (organization: OrganizationOption) => {
    setSelectedOrganizationId(organization.id);
    hydrateOrganizationForm(organization);
    setFormMode('edit');
    setFormOpen(true);
  };

  const toggleOrganizationVisibility = (organization: OrganizationOption) => {
    visibilityMutation.mutate({
      id: organization.id,
      isActive: !organization.is_active,
    });
  };

  const organizationForm = (
    <form
      onSubmit={handleSubmit((values) =>
        formMode === 'create' ? createMutation.mutate(values) : updateMutation.mutate(values)
      )}
      className="mt-5 space-y-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <input
            {...register('slug', { required: 'Slug is required.' })}
            placeholder="Slug (e.g. trail-builders-nepal)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.slug?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
          )}
        </div>
        <div>
          <input
            {...register('name', { required: 'Trail builder name is required.' })}
            placeholder="Trail builder name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.name?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <input
          {...register('tagline')}
          placeholder="Tagline"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          {...register('city')}
          placeholder="City"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          {...register('country')}
          placeholder="Country"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          {...register('logo_url')}
          placeholder="Logo URL or uploaded image data"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          {...register('website_url')}
          placeholder="Website URL"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          {...register('contact_email')}
          placeholder="Contact email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          {...register('contact_phone')}
          placeholder="Contact phone"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white text-sm font-bold text-emerald-800">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo_url}
                alt="Trail builder logo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{form.name.trim().slice(0, 2).toUpperCase() || 'TB'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Trail builder logo</p>
            <p className="mt-1 text-xs text-gray-600">
              Upload a square logo or paste an image URL. Uploaded logos are resized before saving.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                {logoUploadPending ? 'Processing...' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={logoUploadPending}
                  onChange={async (event) => {
                    await handleLogoUpload(event.target.files?.[0] || null);
                    if (event.target) event.target.value = '';
                  }}
                />
              </label>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setValue('logo_url', '', { shouldDirty: true })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            {...register('is_verified')}
          />
          Verified
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            {...register('is_active')}
          />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setFormOpen(false)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            !form.slug.trim() ||
            !form.name.trim() ||
            createMutation.isPending ||
            updateMutation.isPending ||
            logoUploadPending ||
            (formMode === 'edit' && !selectedOrganizationId)
          }
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {formMode === 'create'
            ? createMutation.isPending
              ? 'Creating...'
              : 'Create trail builder'
            : updateMutation.isPending
              ? 'Updating...'
              : 'Update trail builder'}
        </button>
      </div>
    </form>
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">Trail Builders</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Create and maintain profiles for trail builder groups and partners.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:border dark:border-lime-300/45 dark:bg-lime-300/15 dark:text-lime-50 dark:hover:bg-lime-300/25"
        >
          Create trail builder
        </button>
      </div>
      {message && (
        <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {message}
        </p>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Trail builder list</h3>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
            {organizations.length} total
          </span>
        </div>
        {organizations.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            No trail builders created yet.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Trail Builder</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Counts</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {organizations.map((organization) => (
                  <tr key={organization.id} className="dark:text-slate-200">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-emerald-50 text-xs font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
                          {organization.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={organization.logo_url}
                              alt={`${organization.name} logo`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{organization.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-slate-100">{organization.name}</p>
                            <OrganizationVisibilityBadge isActive={organization.is_active} />
                            {organization.is_verified && (
                              <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">/{organization.slug}</p>
                          {organization.tagline && (
                            <p className="mt-1 max-w-xs text-xs text-gray-600 dark:text-slate-300">
                              {organization.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      {organization.city || 'Nepal'}
                      {organization.country ? `, ${organization.country}` : ''}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      <p>{organization.trail_count ?? 0} trails</p>
                      <p>{organization.member_count ?? 0} members</p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-slate-300">
                      <p className="max-w-[220px] break-all">
                        {organization.contact_email || 'No email'}
                      </p>
                      <p>{organization.contact_phone || 'No phone'}</p>
                      <p className="max-w-[220px] break-all">
                        {organization.website_url || 'No website'}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForOrganization(organization)}
                          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-950/70"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleOrganizationVisibility(organization)}
                          disabled={visibilityMutation.isPending}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          {organization.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(organization)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
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
      </div>

      <AppDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={formMode === 'create' ? 'Create trail builder' : 'Edit trail builder'}
        description="Manage profile, contact, and visibility details."
        maxWidthClassName="max-w-3xl"
      >
        {organizationForm}
      </AppDialog>

      <AppDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete trail builder"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Delete {deleteTarget.name}?</p>
              <p className="mt-2 text-xs leading-5">
                This may also remove linked trail builder members, trail assignments,
                fundraising campaigns, and gallery items according to database cascade rules.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete trail builder'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  );
}
