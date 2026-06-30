import OrganizationAvatar from './organization-avatar';
import type { OrganizationMember } from './hooks/use-organization-detail';

const roleLabels: Record<OrganizationMember['role'], string> = {
  org_owner: 'Organization owner',
  org_admin: 'Team lead',
  org_editor: 'Trail coordinator',
};

export default function OrganizationMembersSection({
  members,
}: {
  members: OrganizationMember[];
}) {
  if (members.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Trail Builder Team
        </h2>
        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
          {members.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {members.map((member) => {
          const displayName = member.user_name || 'Trail builder teammate';
          return (
            <article
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <OrganizationAvatar
                name={displayName}
                sizeClassName="h-11 w-11"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {displayName}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-600 dark:text-slate-400">
                  <span>{roleLabels[member.role]}</span>
                  {member.user_city && <span>{member.user_city}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
