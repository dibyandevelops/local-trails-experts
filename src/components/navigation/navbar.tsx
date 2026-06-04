'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import LoginModal from '@/components/auth/login-modal';
import RegisterModal from '@/components/auth/register-modal';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bell,
  Bike,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Dumbbell,
  House,
  Map,
  MapPinned,
  Menu,
  PlusCircle,
  Sparkles,
  Store,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { EXPERTS_BETA_ENABLED } from '@/lib/feature-flags';

type NavItem = {
  label: string;
  href: string;
  badge?: string;
  requiresAuth?: boolean;
  requiresRole?: Array<'admin' | 'expert' | 'participant'>;
  requiresOrgMember?: boolean;
  showFor?: Array<'anonymous' | 'admin' | 'expert' | 'participant'>;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Explore',
    items: [
      { label: 'Events', href: '/events', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Community Rides', href: '/community-rides', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      {
        label: 'Experts',
        href: '/experts',
        showFor: ['anonymous', 'participant', 'expert', 'admin'],
        badge: EXPERTS_BETA_ENABLED ? 'Beta' : undefined,
      },
      { label: 'Trail Builders', href: '/organizations', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Campaigns', href: '/campaigns', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Cycle Hubs', href: '/store-locator', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
    ],
  },
  {
    label: 'For Experts',
    items: [
      {
        label: 'Create Event',
        href: '/events/create',
        showFor: ['expert', 'admin'],
      },
      {
        label: 'Organize Trainings',
        href: '/events/trainings/create',
        showFor: ['expert', 'admin'],
      },
      {
        label: 'Create Trail',
        href: '/upload',
        showFor: ['admin', 'expert'],
      },
      {
        label: 'Trail Builder Dashboard',
        href: '/trail-builders/me',
        showFor: ['expert', 'participant', 'admin'],
        requiresOrgMember: true,
      }
    ],
  },
];
const navItems: NavItem[] = [
  { label: 'Home', href: '/home', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
  { label: 'Explore Trails', href: '/trails', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
  {
    label: 'For Experts',
    href: '/experts/join',
    showFor: ['anonymous'],
    badge: EXPERTS_BETA_ENABLED ? 'Beta' : undefined,
  },
];

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  '/home': House,
  '/trails': Map,
  '/events': CalendarDays,
  '/community-rides': Bike,
  '/experts': Users,
  '/organizations': Users,
  '/campaigns': CircleDollarSign,
  '/store-locator': Store,
  '/events/create': PlusCircle,
  '/events/trainings/create': Dumbbell,
  '/upload': MapPinned,
  '/experts/join': Sparkles,
  '/trail-builders/me': Users,
};

const getMobileNavIcon = (href: string) => {
  const Icon = NAV_ICON_MAP[href] || MapPinned;
  return <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />;
};
const icon = (
  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-sm ring-1 ring-white/60 sm:h-12 sm:w-12">
    <Image
      src="/icons/logo-transparent-source.png?v=20260604-lx"
      alt="LocoXperts logo"
      width={96}
      height={96}
      className="h-full w-full object-contain"
      priority
      unoptimized
    />
  </span>
);

const navButtonClass =
  'inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold transition-colors';
const navButtonIdleClass = 'text-emerald-50/90 hover:bg-white/10 hover:text-white';
const navButtonActiveClass = 'bg-white text-green-950 shadow-sm';
const dropdownContentClass =
  'z-30 flex w-60 flex-col gap-1 rounded-2xl border border-white/10 bg-emerald-950/95 p-2 text-sm text-white shadow-xl shadow-emerald-950/30 backdrop-blur';
const dropdownItemClass =
  'rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-colors';
const mobileItemClass = 'rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors';

type NavbarProps = {
  initialUser?: User | null;
};

export default function Navbar({ initialUser = null }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: user = null, isLoading: loadingUser } = useCurrentUser(initialUser);
  const { data: alertsData } = useQuery<{ unreadCount: number }>({
    queryKey: ['expert-alerts-count', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/experts/me/alerts', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch expert alerts');
      }
      return response.json();
    },
    enabled: user?.role === 'expert',
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
  const { data: builderAccess } = useQuery<{ organizations?: unknown[] }>({
    queryKey: ['navbar-builder-access', user?.id],
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

  const canSeeItem = (item: NavItem) => {
    if (item.showFor) {
      if (!user) return item.showFor.includes('anonymous');
      if (!item.showFor.includes(user.role)) return false;
      if (item.requiresOrgMember && !(builderAccess?.organizations?.length)) return false;
      return true;
    }
    if (!item.requiresAuth) return true;
    if (!user) return false;
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

  const initial =
    user?.name?.trim()?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-emerald-950/95 text-white shadow-sm shadow-emerald-950/20 backdrop-blur supports-[backdrop-filter]:bg-emerald-950/80">
      <div className="container mx-auto px-4 py-2">
        <div className="flex min-h-[58px] items-center justify-between gap-3">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-2xl py-1 pr-2 transition-opacity hover:opacity-95"
            aria-label="Go to LocoXperts home"
          >
            {icon}
            <span className="hidden text-sm font-black uppercase tracking-[0.22em] text-emerald-50 sm:inline">
              LocoXperts
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-sm transition-colors hover:bg-white/15 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) =>
              canSeeItem(item) ? (() => {
                const itemActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${navButtonClass} ${itemActive ? navButtonActiveClass : navButtonIdleClass}`}
                  >
                    <span className="max-w-[140px] truncate">{getNavLabel(item)}</span>
                    {item.badge && (
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          itemActive
                            ? 'border border-amber-300 bg-amber-100 text-amber-800'
                            : 'border border-amber-300/70 bg-amber-200/20 text-amber-100'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })() : null
            )}
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
                          if (hoverCloseTimeout.current) {
                            clearTimeout(hoverCloseTimeout.current);
                            hoverCloseTimeout.current = null;
                          }
                          setOpenGroup(group.label);
                        }}
                        onPointerLeave={() => {
                          hoverCloseTimeout.current = setTimeout(() => {
                            setOpenGroup((current) => (current === group.label ? null : current));
                          }, 120);
                        }}
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
                        onPointerEnter={() => {
                          if (hoverCloseTimeout.current) {
                            clearTimeout(hoverCloseTimeout.current);
                            hoverCloseTimeout.current = null;
                          }
                        }}
                        onPointerLeave={() => {
                          hoverCloseTimeout.current = setTimeout(() => {
                            setOpenGroup((current) => (current === group.label ? null : current));
                          }, 120);
                        }}
                      >
                        {visibleItems.map((item) => {
                          const itemActive = isNavItemActive(item.href);
                          return (
                            <DropdownMenu.Item asChild key={item.href}>
                              <Link
                                href={item.href}
                                className={`block ${dropdownItemClass} ${
                                  itemActive
                                    ? 'bg-white text-green-950'
                                    : 'text-emerald-50 hover:bg-white/10 data-[highlighted]:bg-white/10'
                                }`}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span aria-hidden="true">{getMobileNavIcon(item.href)}</span>
                                  <span className="block truncate">{getNavLabel(item)}</span>
                                  {item.badge && (
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                        itemActive
                                          ? 'border border-amber-300 bg-amber-100 text-amber-800'
                                          : 'border border-amber-300/70 bg-amber-200/20 text-amber-100'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
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
                onClick={() => {
                  setRegisterMessage(null);
                  setRegisterNext(null);
                  setRegisterOpen(true);
                }}
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
                onClick={() => {
                  setLoginMessage(null);
                  setLoginNext(null);
                  setLoginOpen(true);
                }}
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-green-950 transition-colors hover:bg-emerald-50"
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
                      initial
                    )}
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    sideOffset={8}
                    align="end"
                    className={dropdownContentClass}
                  >
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
        </div>

        <div
          className={`mt-2 overflow-hidden rounded-3xl border border-white/10 bg-emerald-950/95 shadow-xl shadow-emerald-950/30 backdrop-blur transition-all duration-300 ease-out lg:hidden ${
            mobileOpen ? 'max-h-[760px] p-3 opacity-100' : 'max-h-0 border-transparent p-0 opacity-0'
          }`}
        >
          <div className="flex flex-col gap-1.5">
            {[...navItems, ...navGroups.flatMap((group) => group.items)].map((item) =>
              canSeeItem(item) ? (() => {
                const itemActive = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`truncate whitespace-nowrap ${mobileItemClass} ${
                      itemActive
                        ? 'bg-white text-green-950'
                        : 'text-emerald-50 hover:bg-white/10'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true">{getMobileNavIcon(item.href)}</span>
                      <span>{getNavLabel(item)}</span>
                      {item.badge && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            itemActive
                              ? 'border border-amber-300 bg-amber-100 text-amber-800'
                              : 'border border-amber-300/70 bg-amber-200/20 text-amber-100'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })() : null
            )}
            {!loadingUser && !user && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl border border-lime-300/60 bg-lime-300/15 px-3 py-2.5 text-sm font-semibold text-lime-50 transition-colors hover:bg-lime-300/25"
                onClick={() => {
                  setMobileOpen(false);
                  setRegisterMessage(null);
                  setRegisterNext(null);
                  setRegisterOpen(true);
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
                onClick={() => setMobileOpen(false)}
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
                  setMobileOpen(false);
                  setLoginMessage(null);
                  setLoginNext(null);
                  setLoginOpen(true);
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
