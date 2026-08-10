import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FieldError, useForm } from 'react-hook-form';
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
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  subscription_plan: 'free' | 'starter' | 'partner' | 'pro';
  subscription_expires_at: string;
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
  subscription_status: 'inactive',
  subscription_plan: 'free',
  subscription_expires_at: '',
};

const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidOptionalUrl(value?: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getInputClass(error?: FieldError) {
  return `w-full rounded-lg border px-3 py-2 text-sm ${
    error
      ? 'border-red-300 bg-red-50 text-red-950 outline-red-500'
      : 'border-gray-300 bg-white text-gray-900'
  }`;
}

function FieldMessage({ error }: { error?: FieldError }) {
  if (!error?.message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{error.message}</p>;
}

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
  const [formError, setFormError] = useState<string | null>(null);
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
      setFormError(null);
      setMessage('Trail builder created.');
      reset(emptyForm);
      setSelectedOrganizationId('');
      setFormOpen(false);
    },
    onError: (error) => {
      setMessage(null);
      setFormError(error instanceof Error ? error.message : 'Failed to create organization.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: OrganizationForm) => updateAdminOrganization(selectedOrganizationId, values),
    onSuccess: async () => {
      await invalidateOrganizations();
      setFormError(null);
      setMessage('Trail builder updated.');
      setFormOpen(false);
    },
    onError: (error) => {
      setMessage(null);
      setFormError(error instanceof Error ? error.message : 'Failed to update organization.');
    },
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
      setMessage(error instanceof Error ? error.message : 'Failed to delete organization.'),
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
      subscription_status: org.subscription_status || 'inactive',
      subscription_plan: org.subscription_plan || 'free',
      subscription_expires_at: org.subscription_expires_at
        ? new Date(org.subscription_expires_at).toISOString().slice(0, 10)
        : '',
    });
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please upload a valid image file for the organization logo.');
      return;
    }
    setLogoUploadPending(true);
    setMessage(null);
    setFormError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, { maxDimension: 512, quality: 0.86 });
      setValue('logo_url', dataUrl, { shouldDirty: true });
    } catch {
      setFormError('Failed to process organization logo.');
    } finally {
      setLogoUploadPending(false);
    }
  };

  const openCreate = () => {
    setSelectedOrganizationId('');
    setMessage(null);
    setFormError(null);
    reset(emptyForm);
    setFormMode('create');
    setFormOpen(true);
  };

  const openEditForOrganization = (organization: OrganizationOption) => {
    setSelectedOrganizationId(organization.id);
    setMessage(null);
    setFormError(null);
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
      onSubmit={handleSubmit((values) => {
        setFormError(null);
        if (formMode === 'create') {
          createMutation.mutate(values);
          return;
        }
        updateMutation.mutate(values);
      })}
      className="mt-5 space-y-4"
    >
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          {formError}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Slug
          <input
            {...register('slug', {
              required: 'Slug is required.',
              maxLength: { value: 120, message: 'Slug must be 120 characters or fewer.' },
              pattern: {
                value: organizationSlugPattern,
                message: 'Use lowercase letters, numbers, and single hyphens only.',
              },
            })}
            placeholder="Slug (e.g. trail-builders-nepal)"
            aria-invalid={Boolean(errors.slug)}
            className={`mt-1 ${getInputClass(errors.slug)}`}
          />
          <FieldMessage error={errors.slug} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Organization name
          <input
            {...register('name', {
              required: 'Trail builder name is required.',
              maxLength: { value: 160, message: 'Name must be 160 characters or fewer.' },
            })}
            placeholder="Trail builder name"
            aria-invalid={Boolean(errors.name)}
            className={`mt-1 ${getInputClass(errors.name)}`}
          />
          <FieldMessage error={errors.name} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Tagline
          <input
            {...register('tagline')}
            placeholder="Tagline"
            className={`mt-1 ${getInputClass(errors.tagline)}`}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          City
          <input
            {...register('city')}
            placeholder="City"
            className={`mt-1 ${getInputClass(errors.city)}`}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Country
          <input
            {...register('country')}
            placeholder="Country"
            className={`mt-1 ${getInputClass(errors.country)}`}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Logo URL
          <input
            {...register('logo_url')}
            placeholder="Logo URL or uploaded image data"
            className={`mt-1 ${getInputClass(errors.logo_url)}`}
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Website URL
          <input
            {...register('website_url', {
              validate: (value) => isValidOptionalUrl(value) || 'Enter a valid http or https URL.',
            })}
            placeholder="Website URL"
            aria-invalid={Boolean(errors.website_url)}
            className={`mt-1 ${getInputClass(errors.website_url)}`}
          />
          <FieldMessage error={errors.website_url} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Contact email
          <input
            {...register('contact_email', {
              validate: (value) => !value.trim() || emailPattern.test(value.trim()) || 'Enter a valid email address.',
            })}
            placeholder="Contact email"
            aria-invalid={Boolean(errors.contact_email)}
            className={`mt-1 ${getInputClass(errors.contact_email)}`}
          />
          <FieldMessage error={errors.contact_email} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Contact phone
          <input
            {...register('contact_phone')}
            placeholder="Contact phone"
            className={`mt-1 ${getInputClass(errors.contact_phone)}`}
          />
        </label>
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

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Subscription
          <select {...register('subscription_status')} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case text-gray-900">
            <option value="inactive">Inactive</option>
            <option value="trialing">Trialing</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Plan
          <select {...register('subscription_plan')} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case text-gray-900">
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="partner">Partner</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Expires
          <input type="date" {...register('subscription_expires_at')} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm normal-case text-gray-900" />
        </label>
        <p className="text-xs leading-5 text-gray-600 md:col-span-3">
          Revenue features require the organization to be verified and subscription status to be active or trialing.
        </p>
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
              : 'Create organization'
            : updateMutation.isPending
              ? 'Updating...'
              : 'Update organization'}
        </button>
      </div>
    </form>
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-slate-100">Organizations</h2>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Create and maintain profiles for organizations and partners.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 dark:border dark:border-lime-300/45 dark:bg-lime-300/15 dark:text-lime-50 dark:hover:bg-lime-300/25"
        >
          Create organization
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
            No organizations created yet.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Organization</th>
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
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                              {organization.subscription_status || 'inactive'}
                            </span>
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
                      {organization.city || 'Kathmandu'}
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
        title={formMode === 'create' ? 'Create organization' : 'Edit organization'}
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
        title="Delete organization"
        description="This action cannot be undone."
        maxWidthClassName="max-w-lg"
      >
        {deleteTarget && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">Delete {deleteTarget.name}?</p>
              <p className="mt-2 text-xs leading-5">
                This may also remove linked organization members, trail assignments,
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
                {deleteMutation.isPending ? 'Deleting...' : 'Delete organization'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </section>
  );
}
