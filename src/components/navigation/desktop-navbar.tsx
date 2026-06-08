import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, ChevronDown } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import type { MutableRefObject } from 'react';
import type { AlertsData, NavbarUser, NavGroup, NavItem } from './navbar.types';
import {
  activeMenuItemClass,
  dropdownContentClass,
  dropdownItemClass,
  getNavIcon,
  navButtonActiveClass,
  navButtonClass,
  navButtonIdleClass,
} from './navbar.config';

type DesktopNavbarProps = {
  navItems: NavItem[];
  navGroups: NavGroup[];
  user: NavbarUser;
  loadingUser: boolean;
  alertsData?: AlertsData;
  openGroup: string | null;
  hoverCloseTimeout: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  accountInitial: string;
  accountActionLabel: string;
  canSeeItem: (item: NavItem) => boolean;
  isNavItemActive: (href: string) => boolean;
  getNavLabel: (item: NavItem) => string;
  setOpenGroup: (group: string | null | ((current: string | null) => string | null)) => void;
  openLogin: () => void;
  openRegister: () => void;
  handleViewProfile: () => void;
  handleLogout: () => void;
};

function NavBadge({ badge, active }: { badge?: string; active: boolean }) {
  if (!badge) return null;

  return (
    <span
      className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        active
          ? 'border border-amber-300 bg-amber-100 text-amber-800'
          : 'border border-amber-300/70 bg-amber-200/20 text-amber-100'
      }`}
    >
      {badge}
    </span>
  );
}

export default function DesktopNavbar({
  navItems,
  navGroups,
  user,
  loadingUser,
  alertsData,
  openGroup,
  hoverCloseTimeout,
  accountInitial,
  accountActionLabel,
  canSeeItem,
  isNavItemActive,
  getNavLabel,
  setOpenGroup,
  openLogin,
  openRegister,
  handleViewProfile,
  handleLogout,
}: DesktopNavbarProps) {
  const clearHoverClose = () => {
    if (hoverCloseTimeout.current) {
      clearTimeout(hoverCloseTimeout.current);
      hoverCloseTimeout.current = null;
    }
  };

  const scheduleGroupClose = (label: string) => {
    hoverCloseTimeout.current = setTimeout(() => {
      setOpenGroup((current) => (current === label ? null : current));
    }, 120);
  };

  return (
    <div className="hidden items-center gap-1 lg:flex">
      {navItems.map((item) => {
        if (!canSeeItem(item)) return null;
        const itemActive = isNavItemActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${navButtonClass} ${itemActive ? navButtonActiveClass : navButtonIdleClass}`}
          >
            <span className="max-w-[140px] truncate">{getNavLabel(item)}</span>
            <NavBadge badge={item.badge} active={itemActive} />
          </Link>
        );
      })}

      {navGroups.map((group) => {
        const visibleItems = group.items.filter(canSeeItem);
        if (visibleItems.length === 0) return null;
        const groupActive = visibleItems.some((item) => isNavItemActive(item.href));

        return (
          <div key={group.label} className="relative">
            <DropdownMenu.Root
              modal={false}
              open={openGroup === group.label}
              onOpenChange={(open) => setOpenGroup(open ? group.label : null)}
            >
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={`${navButtonClass} gap-1.5 ${
                    groupActive ? navButtonActiveClass : navButtonIdleClass
                  }`}
                  aria-label={`${group.label} menu`}
                  onPointerMove={() => {
                    clearHoverClose();
                    setOpenGroup(group.label);
                  }}
                  onPointerLeave={() => scheduleGroupClose(group.label)}
                >
                  <span className="max-w-[140px] truncate">{group.label}</span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={8}
                  align="start"
                  className={dropdownContentClass}
                  onPointerEnter={clearHoverClose}
                  onPointerLeave={() => scheduleGroupClose(group.label)}
                >
                  {visibleItems.map((item) => {
                    const itemActive = isNavItemActive(item.href);
                    return (
                      <DropdownMenu.Item asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={`block ${dropdownItemClass} ${
                            itemActive
                              ? activeMenuItemClass
                              : 'text-emerald-50 hover:bg-white/10 data-[highlighted]:bg-white/10'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span aria-hidden="true">{getNavIcon(item.href)}</span>
                            <span className="block truncate">{getNavLabel(item)}</span>
                            <NavBadge badge={item.badge} active={itemActive} />
                          </span>
                        </Link>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        );
      })}

      {!loadingUser && !user && (
        <button
          type="button"
          onClick={openRegister}
          className="inline-flex h-10 items-center justify-center rounded-full border border-lime-300/60 bg-lime-300/15 px-3 text-sm font-semibold text-lime-100 transition-colors hover:bg-lime-300/25"
        >
          Join
        </button>
      )}

      <ThemeToggle className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-semibold transition-colors hover:bg-white/15" />

      {!loadingUser && user?.role === 'expert' && (
        <Link
          href="/experts/me#trail-requests"
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-white/15 bg-white/10 leading-none transition-colors hover:bg-white/15"
          aria-label="View expert alerts"
          title="View trail request alerts"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {(alertsData?.unreadCount || 0) > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-lime-300 px-1.5 py-0.5 text-[10px] font-bold text-green-950">
              {alertsData?.unreadCount}
            </span>
          )}
        </Link>
      )}

      {!loadingUser && !user && (
        <button
          type="button"
          onClick={openLogin}
          className="inline-flex h-10 items-center justify-center rounded-full border border-lime-300/80 bg-lime-300 px-4 text-sm font-bold text-green-950 transition-colors hover:bg-lime-200 dark:border-lime-200 dark:bg-lime-300 dark:text-green-950 dark:hover:bg-lime-200"
        >
          Login
        </button>
      )}

      {!loadingUser && user && (
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center self-center overflow-hidden rounded-full border border-white/15 bg-white/10 align-middle text-sm font-semibold uppercase leading-none transition-colors hover:bg-white/15"
              aria-label="User menu"
            >
              {user.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile_photo_url}
                  alt={user.name || 'User profile'}
                  className="h-full w-full object-cover"
                />
              ) : (
                accountInitial
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content sideOffset={8} align="end" className={dropdownContentClass}>
              <DropdownMenu.Item asChild>
                <button
                  type="button"
                  onClick={handleViewProfile}
                  className={`w-full text-left text-emerald-50 hover:bg-white/10 data-[highlighted]:bg-white/10 ${dropdownItemClass}`}
                >
                  {accountActionLabel}
                </button>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full text-left text-red-200 hover:bg-red-500/15 data-[highlighted]:bg-red-500/20 ${dropdownItemClass}`}
                >
                  Logout
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
