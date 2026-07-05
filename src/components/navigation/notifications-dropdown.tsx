import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell } from 'lucide-react';
import type { NotificationItem, NotificationsData, NotificationTone } from './navbar.types';
import {
  dropdownContentClass,
  dropdownItemClass,
  mobilePanelBaseClass,
  mobilePanelClosedClass,
  mobilePanelOpenClass,
} from './navbar.config';

const toneClass: Record<NotificationTone, string> = {
  info: 'bg-sky-300',
  success: 'bg-lime-300',
  warning: 'bg-amber-300',
  danger: 'bg-red-300',
};

export const notificationsScrollAreaClass =
  'max-h-[min(360px,calc(100dvh-9rem))] touch-pan-y overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]';

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

export function NotificationIconButton({
  data,
  expanded,
  controls,
  onClick,
}: {
  data?: NotificationsData;
  expanded?: boolean;
  controls?: string;
  onClick?: () => void;
}) {
  const unreadCount = data?.unreadCount || 0;
  const visibleCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-white/15 bg-white/10 leading-none transition-colors hover:bg-white/15"
      aria-label="View notifications"
      aria-expanded={expanded}
      aria-controls={controls}
      title="View recent notifications"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-lime-300 px-1.5 py-0.5 text-center text-[10px] font-bold text-green-950">
          {visibleCount}
        </span>
      )}
    </button>
  );
}

export function MobileNotificationsPanel({
  open,
  data,
  onNavigate,
}: {
  open: boolean;
  data?: NotificationsData;
  onNavigate: () => void;
}) {
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div
      id="mobile-notifications"
      aria-hidden={!open}
      aria-label="Notifications"
      className={`${mobilePanelBaseClass} ${
        open ? mobilePanelOpenClass : mobilePanelClosedClass
      }`}
    >
      {open ? (
        <>
          <div className="border-b border-white/10 px-2 pb-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white">Notifications</p>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[10px] font-bold text-green-950">
                  {unreadCount > 9 ? '9+' : unreadCount} new
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-emerald-100/70">
              Recent updates based on your account role.
            </p>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  className="flex gap-3 rounded-2xl px-3 py-2.5 text-left text-emerald-50 transition-colors hover:bg-white/10"
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass[item.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-emerald-100/80">
                      {item.description}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-emerald-200/70">
                      {formatNotificationTime(item.createdAt)}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-emerald-100/75">
                No recent notifications.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function NotificationsDropdown({
  data,
  onNavigate,
  onOpenChange,
}: {
  data?: NotificationsData;
  onNavigate?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const notifications = data?.notifications || [];

  return (
    <DropdownMenu.Root modal={false} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <NotificationIconButton data={data} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={8} align="end" className={`${dropdownContentClass} w-[360px] max-w-[calc(100vw-2rem)] p-2`}>
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-sm font-bold text-white">Notifications</p>
            <p className="mt-0.5 text-xs text-emerald-100/70">Recent updates based on your account role.</p>
          </div>
          <div
            data-testid="notifications-scroll-area"
            className={notificationsScrollAreaClass}
          >
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <NotificationRow key={item.id} item={item} onNavigate={onNavigate} />
              ))
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
