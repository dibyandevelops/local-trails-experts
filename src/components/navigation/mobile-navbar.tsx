import Link from 'next/link';
import { Bell } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import type { AlertsData, NavbarUser, NavGroup, NavItem } from './navbar.types';
import { activeMenuItemClass, getNavIcon, mobileItemClass } from './navbar.config';

type MobileNavbarProps = {
  mobileOpen: boolean;
  navItems: NavItem[];
  navGroups: NavGroup[];
  user: NavbarUser;
  loadingUser: boolean;
  alertsData?: AlertsData;
  accountActionLabel: string;
  canSeeItem: (item: NavItem) => boolean;
  isNavItemActive: (href: string) => boolean;
  getNavLabel: (item: NavItem) => string;
  closeMobileMenu: () => void;
  openLogin: () => void;
  openRegister: () => void;
  handleViewProfile: () => void;
  handleLogout: () => void;
};

function MobileBadge({ badge, active }: { badge?: string; active: boolean }) {
  if (!badge) return null;

  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        active
          ? 'border border-amber-300 bg-amber-100 text-amber-800'
          : 'border border-amber-300/70 bg-amber-200/20 text-amber-100'
      }`}
    >
      {badge}
    </span>
  );
}

export default function MobileNavbar({
  mobileOpen,
  navItems,
  navGroups,
  user,
  loadingUser,
  alertsData,
  accountActionLabel,
  canSeeItem,
  isNavItemActive,
  getNavLabel,
  closeMobileMenu,
  openLogin,
  openRegister,
  handleViewProfile,
  handleLogout,
}: MobileNavbarProps) {
  return (
    <div
      className={`mt-2 overflow-hidden rounded-3xl border border-white/10 bg-emerald-950/95 shadow-xl shadow-emerald-950/30 backdrop-blur transition-all duration-300 ease-out lg:hidden ${
        mobileOpen ? 'max-h-[760px] p-3 opacity-100' : 'max-h-0 border-transparent p-0 opacity-0'
      }`}
    >
      <div className="flex flex-col gap-1.5">
        {[...navItems, ...navGroups.flatMap((group) => group.items)].map((item) => {
          if (!canSeeItem(item)) return null;
          const itemActive = isNavItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`truncate whitespace-nowrap ${mobileItemClass} ${
                itemActive ? activeMenuItemClass : 'text-emerald-50 hover:bg-white/10'
              }`}
              onClick={closeMobileMenu}
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">{getNavIcon(item.href)}</span>
                <span>{getNavLabel(item)}</span>
                <MobileBadge badge={item.badge} active={itemActive} />
              </span>
            </Link>
          );
        })}

        {!loadingUser && !user && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-lime-300/60 bg-lime-300/15 px-3 py-2.5 text-sm font-semibold text-lime-50 transition-colors hover:bg-lime-300/25"
            onClick={() => {
              closeMobileMenu();
              openRegister();
            }}
          >
            Join
          </button>
        )}

        <ThemeToggle className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-white/15" />

        {!loadingUser && user?.role === 'expert' && (
          <Link
            href="/experts/me#trail-requests"
            className={`${mobileItemClass} text-emerald-50 hover:bg-white/10`}
            onClick={closeMobileMenu}
          >
            <span className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span>Alerts</span>
              {(alertsData?.unreadCount || 0) > 0 && (
                <span className="rounded-full bg-lime-300 px-1.5 py-0.5 text-[10px] font-bold text-green-950">
                  {alertsData?.unreadCount}
                </span>
              )}
            </span>
          </Link>
        )}

        {!loadingUser && !user && (
          <button
            type="button"
            className="rounded-2xl bg-white px-3 py-2.5 text-left text-sm font-semibold text-green-950 transition-colors hover:bg-emerald-50"
            onClick={() => {
              closeMobileMenu();
              openLogin();
            }}
          >
            Login
          </button>
        )}

        {!loadingUser && user && (
          <>
            <button
              type="button"
              onClick={handleViewProfile}
              className={`${mobileItemClass} text-left text-emerald-50 hover:bg-white/10`}
            >
              {accountActionLabel}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`${mobileItemClass} text-left text-red-200 hover:bg-red-500/15`}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
