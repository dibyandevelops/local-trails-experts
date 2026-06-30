'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu, X } from 'lucide-react';
import LoginModal from '@/components/auth/login-modal';
import RegisterModal from '@/components/auth/register-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { User } from '@/types';
import DesktopNavbar from './desktop-navbar';
import MobileNavbar from './mobile-navbar';
import NavbarBrand from './navbar-brand';
import { navGroups, navItems } from './navbar.config';
import type { NavItem, NotificationsData } from './navbar.types';

type NavbarProps = {
  initialUser?: User | null;
};

export default function Navbar({ initialUser = null }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: user = null, isLoading: loadingUser } = useCurrentUser(initialUser);
  const { data: notificationsData } = useQuery<NotificationsData>({
    queryKey: ['me-notifications', user?.id, user?.role],
    queryFn: async () => {
      const response = await fetch('/api/me/notifications', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    enabled: Boolean(user),
    refetchInterval: 30000,
    retry: false,
  });
  const { data: eventsCount = 0 } = useQuery<number>({
    queryKey: ['navbar-events-count'],
    queryFn: async () => {
      const response = await fetch('/api/events?upcoming=true', { cache: 'no-store' });
      if (!response.ok) return 0;
      const data = await response.json().catch(() => ({}));
      return Array.isArray(data?.events) ? data.events.length : 0;
    },
    refetchInterval: 60000,
    retry: false,
  });
  const { data: builderAccess } = useQuery<{
    organizations?: Array<{ membership_role?: string }>;
  }>({
    queryKey: ['navbar-organization-access', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/organizations/me', { cache: 'no-store' });
      if (!response.ok) return { organizations: [] };
      return response.json();
    },
    enabled: Boolean(user),
    staleTime: 60000,
    retry: false,
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginNext, setLoginNext] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [registerNext, setRegisterNext] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const hoverCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
    if (hoverCloseTimeout.current) {
      clearTimeout(hoverCloseTimeout.current);
      hoverCloseTimeout.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const loginFlag = searchParams.get('login');
    if (loginFlag !== '1' && loginFlag !== 'true') return;

    if (user) {
      // Already authenticated; just strip the flag.
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('login');
        url.searchParams.delete('message');
        url.searchParams.delete('next');
        const nextUrl = `${url.pathname}${url.search ? url.search : ''}${url.hash ? url.hash : ''}`;
        window.history.replaceState(null, '', nextUrl);
      }
      return;
    }

    const errorParam = searchParams.get('error');
    const errorMessage = errorParam ? 'Authentication failed. Please try again.' : null;

    setLoginMessage(searchParams.get('message') || errorMessage);
    setLoginNext(searchParams.get('next'));
    setLoginOpen(true);

    // Strip login-related params so refresh/back doesn't keep reopening the modal.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('message');
      url.searchParams.delete('next');
      const nextUrl = `${url.pathname}${url.search ? url.search : ''}${url.hash ? url.hash : ''}`;
      window.history.replaceState(null, '', nextUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, searchParamsString, user?.id]);

  useEffect(() => {
    const onboarding = searchParams.get('onboarding');
    if (onboarding !== '1') return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('onboarding');
      const nextUrl = `${url.pathname}${url.search ? url.search : ''}${url.hash ? url.hash : ''}`;
      window.history.replaceState(null, '', nextUrl);
    }
  }, [searchParams, searchParamsString, user?.id, user?.role]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (user) return;
      const custom = event as CustomEvent<{ message?: string; next?: string }>;
      setRegisterMessage(custom.detail?.message || null);
      setRegisterNext(custom.detail?.next || null);
      setRegisterOpen(true);
    };
    window.addEventListener('open-register', handler);
    return () => window.removeEventListener('open-register', handler);
  }, [user]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (user) return;
      const custom = event as CustomEvent<{ message?: string; next?: string }>;
      setRegisterOpen(false);
      setLoginMessage(custom.detail?.message || null);
      setLoginNext(custom.detail?.next || null);
      setLoginOpen(true);
    };
    window.addEventListener('open-login', handler);
    return () => window.removeEventListener('open-login', handler);
  }, [user]);

  const openRegister = () => {
    setRegisterMessage(null);
    setRegisterNext(null);
    setRegisterOpen(true);
  };

  const openLogin = () => {
    setLoginMessage(null);
    setLoginNext(null);
    setLoginOpen(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setMobileOpen(false);
      queryClient.setQueryData(['me'], null);
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/');
    }
  };

  const handleViewProfile = () => {
    if (!user) return;
    if (user.role === 'expert') {
      router.push('/experts/me');
    } else if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/participants/me');
    }
    setMobileOpen(false);
  };

  const accountActionLabel = user?.role === 'admin' ? 'Admin Panel' : 'View profile';
  const ownsOrganization = Boolean(
    builderAccess?.organizations?.some(
      (organization) => organization.membership_role === 'org_owner'
    )
  );
  const hasOrganizationAccess = Boolean(builderAccess?.organizations?.length);

  const canSeeItem = (item: NavItem) => {
    if (item.showFor) {
      if (!user) return item.showFor.includes('anonymous');
      if (!item.showFor.includes(user.role)) return false;
      if (
        item.href === '/organizations/create' &&
        (!user.is_verified_expert || ownsOrganization)
      ) return false;
      if (item.requiresOrgMember && !(builderAccess?.organizations?.length)) return false;
      return true;
    }
    if (!item.requiresAuth) return true;
    if (!user) return false;
    if (
      item.href === '/organizations/create' &&
      (!user.is_verified_expert || ownsOrganization)
    ) return false;
    if (item.requiresOrgMember && !(builderAccess?.organizations?.length)) return false;
    if (!item.requiresRole) return true;
    return item.requiresRole.includes(user.role);
  };

  const hasExactVisibleNavMatch =
    navGroups.some((group) => group.items.some((item) => canSeeItem(item) && item.href === pathname)) ||
    navItems.some((item) => canSeeItem(item) && item.href === pathname);
  const isNavItemActive = (href: string) => {
    if (pathname === href) return true;
    if (hasExactVisibleNavMatch) return false;
    return pathname.startsWith(`${href}/`);
  };
  const getNavLabel = (item: NavItem) => {
    if (item.href === '/events') return `Events (${eventsCount})`;
    return item.label;
  };

  const accountInitial =
    user?.name?.trim()?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-emerald-950/95 text-white shadow-sm shadow-emerald-950/20 backdrop-blur supports-[backdrop-filter]:bg-emerald-950/80">
      <div className="container mx-auto px-4 py-2">
        <div className="flex min-h-[58px] items-center justify-between gap-3">
          <NavbarBrand />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-sm transition-colors hover:bg-white/15 lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <DesktopNavbar
            navItems={navItems}
            navGroups={navGroups}
            user={user}
            loadingUser={loadingUser}
            notificationsData={notificationsData}
            openGroup={openGroup}
            hoverCloseTimeout={hoverCloseTimeout}
            accountInitial={accountInitial}
            accountActionLabel={accountActionLabel}
            hasOrganizationAccess={hasOrganizationAccess}
            canSeeItem={canSeeItem}
            isNavItemActive={isNavItemActive}
            getNavLabel={getNavLabel}
            setOpenGroup={setOpenGroup}
            openLogin={openLogin}
            openRegister={openRegister}
            handleViewProfile={handleViewProfile}
            handleLogout={handleLogout}
          />
        </div>

        <MobileNavbar
          mobileOpen={mobileOpen}
          navItems={navItems}
          navGroups={navGroups}
          user={user}
          loadingUser={loadingUser}
          notificationsData={notificationsData}
          accountActionLabel={accountActionLabel}
          hasOrganizationAccess={hasOrganizationAccess}
          canSeeItem={canSeeItem}
          isNavItemActive={isNavItemActive}
          getNavLabel={getNavLabel}
          closeMobileMenu={() => setMobileOpen(false)}
          openLogin={openLogin}
          openRegister={openRegister}
          handleViewProfile={handleViewProfile}
          handleLogout={handleLogout}
        />
      </div>

      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        message={loginMessage}
        next={loginNext}
        onOpenRegister={() => {
          setLoginOpen(false);
          setRegisterMessage(null);
          setRegisterNext(null);
          setRegisterOpen(true);
        }}
      />
      <RegisterModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        notice={registerMessage}
        next={registerNext || undefined}
      />
    </nav>
  );
}
