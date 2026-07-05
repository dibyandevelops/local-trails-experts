import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import type { NavbarUser, NavGroup, NavItem } from './navbar.types';
import {
  activeMenuItemClass,
  getNavIcon,
  mobileItemClass,
  mobilePanelBaseClass,
  mobilePanelClosedClass,
  mobilePanelOpenClass,
} from './navbar.config';

type MobileNavbarProps = {
  mobileOpen: boolean;
  navItems: NavItem[];
  navGroups: NavGroup[];
  user: NavbarUser;
  loadingUser: boolean;
  accountActionLabel: string;
  hasOrganizationAccess: boolean;
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
  accountActionLabel,
  hasOrganizationAccess,
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
      id="mobile-navigation"
      className={`${mobilePanelBaseClass} ${
        mobileOpen ? mobilePanelOpenClass : mobilePanelClosedClass
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

        {!loadingUser && !user && (
          <button
            type="button"
            className="rounded-2xl border border-lime-300/80 bg-lime-300 px-3 py-2.5 text-left text-sm font-bold text-green-950 transition-colors hover:bg-lime-200 dark:border-lime-200 dark:bg-lime-300 dark:text-green-950 dark:hover:bg-lime-200"
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
            {hasOrganizationAccess && (
              <Link
                href="/organizations/me"
                className={`${mobileItemClass} text-left text-emerald-50 hover:bg-white/10`}
                onClick={closeMobileMenu}
              >
                Organization Dashboard
              </Link>
            )}
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
