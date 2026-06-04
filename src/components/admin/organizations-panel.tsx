import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-700'
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
  const [form, setForm] = useState<OrganizationForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [deleteTarget, setDeleteTarget] = useState<OrganizationOption | null>(null);
  const [logoUploadPending, setLogoUploadPending] = useState(false);

  const { data: organizations = [] } = useQuery<OrganizationOption[]>({
    queryKey: ['admin-organizations'],
    queryFn: fetchAdminOrganizations,
  });

  const invalidateOrganizations = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminOrganization(form),
    onSuccess: async () => {
      await invalidateOrganizations();
      setMessage('Trail builder created.');
      setForm(emptyForm);
      setSelectedOrganizationId('');
      setFormOpen(false);
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to create trail builder.'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateAdminOrganization(selectedOrganizationId, form),
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
        setForm((prev) => ({ ...prev, is_active: organization.is_active }));
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
        setForm(emptyForm);
      }
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to delete trail builder.'),
  });

  const hydrateOrganizationForm = (org: OrganizationOption) => {
    setForm((prev) => ({
      ...prev,
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
    }));
  };

  const onChange = (key: keyof OrganizationForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      onChange('logo_url', dataUrl);
    } catch {
      setMessage('Failed to process trail builder logo.');
    } finally {
      setLogoUploadPending(false);
    }
  };

  const openCreate = () => {
    setSelectedOrganizationId('');
    setForm(emptyForm);
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
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={form.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          placeholder="Slug (e.g. trail-builders-nepal)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.name}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="Trail builder name"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.tagline}
          onChange={(event) => onChange('tagline', event.target.value)}
          placeholder="Tagline"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.city}
          onChange={(event) => onChange('city', event.target.value)}
          placeholder="City"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.country}
          onChange={(event) => onChange('country', event.target.value)}
          placeholder="Country"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.logo_url}
          onChange={(event) => onChange('logo_url', event.target.value)}
          placeholder="Logo URL or uploaded image data"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.website_url}
          onChange={(event) => onChange('website_url', event.target.value)}
          placeholder="Website URL"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.contact_email}
          onChange={(event) => onChange('contact_email', event.target.value)}
          placeholder="Contact email"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.contact_phone}
          onChange={(event) => onChange('contact_phone', event.target.value)}
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
                  onClick={() => onChange('logo_url', '')}
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
            checked={form.is_verified}
            onChange={(event) => onChange('is_verified', event.target.checked)}
          />
          Verified
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => onChange('is_active', event.target.checked)}
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
          type="button"
          onClick={() =>
            formMode === 'create' ? createMutation.mutate() : updateMutation.mutate()
          }
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
    </div>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Trail Builders</h2>
          <p className="text-sm text-gray-600">
            Create and maintain profiles for trail builder groups and partners.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Create trail builder
        </button>
      </div>
      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Trail builder list</h3>
          <span className="text-xs font-medium text-gray-500">
            {organizations.length} total
          </span>
        </div>
        {organizations.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No trail builders created yet.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Trail Builder</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Counts</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-emerald-50 text-xs font-bold text-emerald-800">
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
                            <p className="font-semibold text-gray-900">{organization.name}</p>
                            <OrganizationVisibilityBadge isActive={organization.is_active} />
                            {organization.is_verified && (
                              <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-cyan-700">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">/{organization.slug}</p>
                          {organization.tagline && (
                            <p className="mt-1 max-w-xs text-xs text-gray-600">
                              {organization.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">
                      {organization.city || 'Nepal'}
                      {organization.country ? `, ${organization.country}` : ''}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">
                      <p>{organization.trail_count ?? 0} trails</p>
                      <p>{organization.member_count ?? 0} members</p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-600">
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
