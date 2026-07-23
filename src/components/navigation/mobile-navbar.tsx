import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import type { NavbarUser, NavGroup, NavItem, NavSection } from './navbar.types';
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

function MobileSection({
  section,
  canSeeItem,
  isNavItemActive,
  getNavLabel,
  closeMobileMenu,
  open,
  onToggle,
}: {
  section: NavSection;
  canSeeItem: (item: NavItem) => boolean;
  isNavItemActive: (href: string) => boolean;
  getNavLabel: (item: NavItem) => string;
  closeMobileMenu: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const visibleItems = section.items.filter(canSeeItem);
  if (visibleItems.length === 0) return null;

  return (
    <div className="border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
      {section.label && (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/65 transition-colors hover:bg-white/10 hover:text-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
          aria-expanded={open}
          onClick={onToggle}
        >
          <span>{section.label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      )}
      <div className={`${open || !section.label ? 'flex' : 'hidden'} flex-col gap-1.5`}>
        {visibleItems.map((item) => {
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
      </div>
    </div>
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
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    if (!mobileOpen) setOpenSection(null);
  }, [mobileOpen]);

  return (
    <div
      id="mobile-navigation"
      className={`${mobilePanelBaseClass} ${
        mobileOpen ? mobilePanelOpenClass : mobilePanelClosedClass
      }`}
    >
      <div className="flex flex-col gap-1.5">
        {navItems.map((item) => {
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
        {navGroups.map((group) => {
          const sections = group.sections || [{ label: '', items: group.items }];
          return sections.map((section) => {
            const sectionKey = `${group.label}-${section.label}`;
            return (
              <MobileSection
                key={sectionKey}
                section={section}
                canSeeItem={canSeeItem}
                isNavItemActive={isNavItemActive}
                getNavLabel={getNavLabel}
                closeMobileMenu={closeMobileMenu}
                open={openSection === sectionKey}
                onToggle={() =>
                  setOpenSection((current) => (current === sectionKey ? null : sectionKey))
                }
              />
            );
          });
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
              <>
                <Link
                  href="/organizations/me"
                  className={`${mobileItemClass} text-left text-emerald-50 hover:bg-white/10`}
                  onClick={closeMobileMenu}
                >
                  Organization Dashboard
                </Link>
                <Link
                  href="/organizations/me/subscription"
                  className={`${mobileItemClass} text-left text-emerald-50 hover:bg-white/10`}
                  onClick={closeMobileMenu}
                >
                  Organization Subscription
                </Link>
              </>
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
