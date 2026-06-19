import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell } from 'lucide-react';
import type { NotificationItem, NotificationsData, NotificationTone } from './navbar.types';
import { dropdownContentClass, dropdownItemClass } from './navbar.config';

const toneClass: Record<NotificationTone, string> = {
  info: 'bg-sky-300',
  success: 'bg-lime-300',
  warning: 'bg-amber-300',
  danger: 'bg-red-300',
};

function formatNotificationTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Recent';

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function NotificationRow({ item, onNavigate }: { item: NotificationItem; onNavigate?: () => void }) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex w-full gap-3 text-left ${dropdownItemClass} text-emerald-50 hover:bg-white/10 data-[highlighted]:bg-white/10`}
      >
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass[item.tone]}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-emerald-100/80">
            {item.description}
          </span>
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-200/70">
            {formatNotificationTime(item.createdAt)}
          </span>
        </span>
      </Link>
    </DropdownMenu.Item>
  );
}

export function NotificationsDropdown({ data }: { data?: NotificationsData }) {
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const visibleCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-white/15 bg-white/10 leading-none transition-colors hover:bg-white/15"
          aria-label="View notifications"
          title="View recent notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-lime-300 px-1.5 py-0.5 text-center text-[10px] font-bold text-green-950">
              {visibleCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={8} align="end" className={`${dropdownContentClass} w-[360px] max-w-[calc(100vw-2rem)] p-2`}>
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-sm font-bold text-white">Notifications</p>
            <p className="mt-0.5 text-xs text-emerald-100/70">Recent updates based on your account role.</p>
          </div>
          <div className="max-h-[360px] overflow-y-auto py-1">
            {notifications.length > 0 ? (
              notifications.map((item) => <NotificationRow key={item.id} item={item} />)
            ) : (
              <div className="px-3 py-6 text-center text-sm text-emerald-100/75">
                No recent notifications.
              </div>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MobileNotifications({ data, onNavigate }: { data?: NotificationsData; onNavigate: () => void }) {
  const notifications = (data?.notifications || []).slice(0, 4);
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-50">
          <Bell className="h-4 w-4" aria-hidden="true" />
          Notifications
        </span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-lime-300 px-1.5 py-0.5 text-[10px] font-bold text-green-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {notifications.length > 0 ? (
        <div className="mt-1 space-y-1">
          {notifications.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className="flex gap-2 rounded-xl px-2 py-2 text-left hover:bg-white/10"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass[item.tone]}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                <span className="line-clamp-2 block text-xs leading-5 text-emerald-100/75">{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-2 py-3 text-sm text-emerald-100/70">No recent notifications.</p>
      )}
    </div>
  );
}
