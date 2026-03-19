import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import { getSportLabel } from '@/services/constants/sports';
import {
  deleteAdminUser,
  fetchAdminUsers,
  type AdminUser,
} from '@/services/admin/admin.service';

type UsersPanelProps = {
  role: 'expert' | 'participant';
  title: string;
  description: string;
};

export default function UsersPanel({ role, title, description }: UsersPanelProps) {
  const queryClient = useQueryClient();
  const {
    data: users = [],
    isLoading,
  } = useQuery<AdminUser[]>({
    queryKey: QUERY_KEYS.admin.users(role),
    queryFn: () => fetchAdminUsers(role),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.users(role) });
    },
  });

  const handleDeleteUser = async (user: AdminUser) => {
    if (
      !confirm(
        `Delete ${user.name || user.email}? This cannot be undone and may fail if the user has related records.`
      )
    ) {
      return;
    }
    try {
      await deleteUserMutation.mutateAsync(user.id);
    } catch (error) {
      console.error('Error deleting user', error);
      alert(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {isLoading ? (
        <p className="text-sm text-gray-600">Loading {role}s...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-600">No {role}s found.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    disabled={deleteUserMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-400">City</p>
                    <p>{user.city || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-400">Phone</p>
                    <p>{user.phone || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] font-semibold uppercase text-gray-400">Sports</p>
                    <p>
                      {(user.sports || []).length > 0
                        ? (user.sports || []).map((sport) => getSportLabel(sport)).join(', ')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-400">Joined</p>
                    <p>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">{role === 'expert' ? 'Expert' : 'Participant'}</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Sports</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-200">
                    <td className="px-3 py-3 text-sm text-gray-900">
                      <div className="font-semibold">{user.name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {user.city || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {(user.sports || []).length > 0
                        ? (user.sports || []).map((sport) => getSportLabel(sport)).join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {user.phone || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        disabled={deleteUserMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
