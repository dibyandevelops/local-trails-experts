import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminOrganizationMember,
  fetchAdminOrganizationMembers,
  fetchAdminOrganizations,
  fetchAdminUsers,
  upsertAdminOrganizationMember,
  updateAdminOrganizationMember,
  type AdminUser,
  type OrganizationMember,
  type OrganizationOption,
} from '@/services/admin/admin.service';
import AppDialog from '@/components/ui/app-dialog';

export default function OrganizationMembersPanel() {
  const queryClient = useQueryClient();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newRole, setNewRole] = useState<'org_admin' | 'org_editor'>('org_editor');
  const [message, setMessage] = useState<string | null>(null);
  const [memberFormOpen, setMemberFormOpen] = useState(false);

  const { data: organizations = [] } = useQuery<OrganizationOption[]>({
    queryKey: ['admin-organizations'],
    queryFn: fetchAdminOrganizations,
  });
  const { data: experts = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users-expert'],
    queryFn: () => fetchAdminUsers('expert'),
  });
  const { data: participants = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users-participant'],
    queryFn: () => fetchAdminUsers('participant'),
  });

  const memberCandidates = useMemo(() => [...experts, ...participants], [experts, participants]);

  const { data: members = [], isLoading } = useQuery<OrganizationMember[]>({
    queryKey: ['admin-organization-members', selectedOrganizationId],
    queryFn: () => fetchAdminOrganizationMembers(selectedOrganizationId),
    enabled: Boolean(selectedOrganizationId),
  });

  const invalidateMembers = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['admin-organization-members', selectedOrganizationId],
    });
  };

  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertAdminOrganizationMember({
        organization_id: selectedOrganizationId,
        user_id: selectedUserId,
        role: newRole,
        status: 'active',
      }),
    onSuccess: async () => {
      await invalidateMembers();
      setMessage('Trail builder member saved.');
      setSelectedUserId('');
      setMemberFormOpen(false);
    },
    onError: () => setMessage('Failed to save trail builder member.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      memberId,
      role,
      status,
    }: {
      memberId: string;
      role?: 'org_admin' | 'org_editor';
      status?: 'active' | 'invited' | 'disabled';
    }) => updateAdminOrganizationMember(memberId, { role, status }),
    onSuccess: async () => {
      await invalidateMembers();
      setMessage('Trail builder member updated.');
    },
    onError: () => setMessage('Failed to update trail builder member.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => deleteAdminOrganizationMember(memberId),
    onSuccess: async () => {
      await invalidateMembers();
      setMessage('Trail builder member removed.');
    },
    onError: () => setMessage('Failed to remove trail builder member.'),
  });

  const memberForm = (
    <div className="mt-5 space-y-3">
      <select
        value={selectedOrganizationId}
        onChange={(event) => setSelectedOrganizationId(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Select trail builder</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      <select
        value={selectedUserId}
        onChange={(event) => setSelectedUserId(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        disabled={!selectedOrganizationId}
      >
        <option value="">Select user</option>
        {memberCandidates.map((user) => (
          <option key={user.id} value={user.id}>
            {(user.name || user.email) + ` (${user.role})`}
          </option>
        ))}
      </select>
      <select
        value={newRole}
        onChange={(event) => setNewRole(event.target.value as 'org_admin' | 'org_editor')}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        disabled={!selectedOrganizationId}
      >
        <option value="org_editor">Builder editor</option>
        <option value="org_admin">Builder admin</option>
      </select>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setMemberFormOpen(false)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => upsertMutation.mutate()}
          disabled={!selectedOrganizationId || !selectedUserId || upsertMutation.isPending}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {upsertMutation.isPending ? 'Saving...' : 'Add / Update'}
        </button>
      </div>
    </div>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Trail Builder Members</h2>
          <p className="text-sm text-gray-600">
            Assign experts/participants to trail builders with admin or editor roles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMemberFormOpen(true)}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Add member
        </button>
      </div>
      {message && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div className="mb-5">
        <select
          value={selectedOrganizationId}
          onChange={(event) => setSelectedOrganizationId(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Select trail builder</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedOrganizationId ? (
        <p className="text-sm text-gray-600">Select a trail builder to manage its members.</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-600">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-600">No members assigned yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{member.user_name || 'Unnamed'}</td>
                  <td className="py-2 pr-4">{member.user_email}</td>
                  <td className="py-2 pr-4">
                    <select
                      value={member.role}
                      onChange={(event) =>
                        updateMutation.mutate({
                          memberId: member.id,
                          role: event.target.value as 'org_admin' | 'org_editor',
                        })
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="org_admin">Builder admin</option>
                      <option value="org_editor">Builder editor</option>
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={member.status}
                      onChange={(event) =>
                        updateMutation.mutate({
                          memberId: member.id,
                          status: event.target.value as 'active' | 'invited' | 'disabled',
                        })
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="invited">Invited</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(member.id)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AppDialog
        open={memberFormOpen}
        onOpenChange={setMemberFormOpen}
        title="Add trail builder member"
        description="Assign a user to a trail builder and choose their role."
        maxWidthClassName="max-w-xl"
      >
        {memberForm}
      </AppDialog>
    </section>
  );
}
