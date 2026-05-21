import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminOrganization,
  fetchAdminOrganizations,
  updateAdminOrganization,
  type OrganizationOption,
} from '@/services/admin/admin.service';

type OrganizationForm = {
  slug: string;
  name: string;
  tagline: string;
  city: string;
  country: string;
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
  website_url: '',
  contact_email: '',
  contact_phone: '',
  is_verified: false,
  is_active: true,
};

export default function OrganizationsPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [form, setForm] = useState<OrganizationForm>(emptyForm);

  const { data: organizations = [] } = useQuery<OrganizationOption[]>({
    queryKey: ['admin-organizations'],
    queryFn: fetchAdminOrganizations,
  });

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrganizationId) || null,
    [organizations, selectedOrganizationId]
  );

  const invalidateOrganizations = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminOrganization(form),
    onSuccess: async () => {
      await invalidateOrganizations();
      setMessage('Organization created.');
      setForm(emptyForm);
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to create organization.'),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateAdminOrganization(selectedOrganizationId, form),
    onSuccess: async () => {
      await invalidateOrganizations();
      setMessage('Organization updated.');
    },
    onError: (error) =>
      setMessage(error instanceof Error ? error.message : 'Failed to update organization.'),
  });

  const onSelectOrganization = (id: string) => {
    setSelectedOrganizationId(id);
    const org = organizations.find((item) => item.id === id);
    if (!org) return;
    setForm((prev) => ({
      ...prev,
      slug: org.slug || '',
      name: org.name || '',
      is_verified: org.is_verified,
      is_active: org.is_active,
    }));
  };

  const onChange = (key: keyof OrganizationForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Organizations</h2>
      <p className="text-sm text-gray-600 mb-5">
        Create and maintain organization profiles for trail builder groups and partners.
      </p>
      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Select organization to edit</label>
        <select
          value={selectedOrganizationId}
          onChange={(event) => onSelectOrganization(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Create new organization</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

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
          placeholder="Organization name"
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

      <div className="mt-4 flex flex-wrap items-center gap-4">
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

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!form.slug.trim() || !form.name.trim() || createMutation.isPending}
          className="rounded-lg bg-green-700 text-white px-4 py-2 text-sm font-semibold hover:bg-green-800 disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating...' : 'Create organization'}
        </button>
        <button
          type="button"
          onClick={() => updateMutation.mutate()}
          disabled={!selectedOrganization || updateMutation.isPending}
          className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-100 disabled:opacity-60"
        >
          {updateMutation.isPending ? 'Updating...' : 'Update organization'}
        </button>
      </div>
    </section>
  );
}
