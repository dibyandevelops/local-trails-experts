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

type NavItem = {
  label: string;
  href: string;
  requiresAuth?: boolean;
  requiresRole?: Array<'admin' | 'expert' | 'participant'>;
  showFor?: Array<'anonymous' | 'admin' | 'expert' | 'participant'>;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Explore Nepal',
    items: [
      { label: 'Events', href: '/events', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Community Rides', href: '/community-rides', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Experts', href: '/experts', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
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
        href: '/trails/create',
        showFor: ['admin', 'expert'],
      }
    ],
  },
];
const navItems: NavItem[] = [
  { label: 'Trail Map', href: '/trails', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
  { label: 'For Experts', href: '/experts/join', showFor: ['anonymous'] },
];
const icon = (
  <Image
    src="/icons/logo-transparent-source.png"
    alt="LocoXperts logo"
    width={220}
    height={120}
    className="h-20 w-[220px] shrink-0 object-contain object-left"
    priority
  />
);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginNext, setLoginNext] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [registerNext, setRegisterNext] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const hoverCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
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
  }, [searchParams.toString(), user?.id]);

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

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setMenuOpen(false);
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
    setMenuOpen(false);
    setMobileOpen(false);
  };

  const canSeeItem = (item: NavItem) => {
    if (item.showFor) {
      if (!user) return item.showFor.includes('anonymous');
      return item.showFor.includes(user.role);
    }
    if (!item.requiresAuth) return true;
    if (!user) return false;
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

  const initial =
    user?.name?.trim()?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <nav className="sticky top-0 z-30 border-b border-green-900/70 bg-gradient-to-r from-green-900 via-green-800 to-emerald-800 text-white shadow-lg backdrop-blur">
      <div className="container mx-auto px-4 py-2">
        <div className="flex min-h-[80px] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-2xl font-bold leading-none transition-opacity hover:opacity-95"
          >
            {icon}
            {/* <span className="tracking-tight">LocoXperts</span> */}
          </Link>
          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-green-500/70 bg-white/10 hover:bg-white/15"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          <div className="hidden md:flex items-center gap-3 rounded-full border border-green-500/40 bg-white/10 px-3 py-2 shadow-inner shadow-black/10">
            {navItems.map((item) =>
              canSeeItem(item) ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-10 items-center rounded-lg px-3 py-1 text-sm font-semibold transition-all ${
                    isNavItemActive(item.href)
                      ? 'bg-white text-green-900 shadow-sm'
                      : 'text-green-50 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{item.label}</span>
                </Link>
              ) : null
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
                        className={`inline-flex h-10 items-center gap-1 rounded-lg px-3 py-1 text-sm font-semibold transition-all ${
                          groupActive
                            ? 'bg-white text-green-900 shadow-sm'
                            : 'text-green-50 hover:bg-white/15 hover:text-white'
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
                        <span className="truncate max-w-[140px]">{group.label}</span>
                        <span className="text-xs">▾</span>
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        sideOffset={8}
                        align="start"
                        className="z-30 flex w-56 flex-col gap-1 rounded-xl border border-green-700/60 bg-green-950/95 p-2 text-sm text-white shadow-xl"
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
                        {visibleItems.map((item) => (
                          <DropdownMenu.Item asChild key={item.href}>
                            <Link
                              href={item.href}
                              className={`block rounded-lg px-3 py-2 text-sm font-semibold outline-none transition ${
                                isNavItemActive(item.href)
                                  ? 'bg-white text-green-900'
                                  : 'text-green-50 hover:bg-white/15 data-[highlighted]:bg-white/15'
                              }`}
                            >
                              <span className="block truncate">{item.label}</span>
                            </Link>
                          </DropdownMenu.Item>
                        ))}
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
                className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300/80 bg-amber-200/15 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-200/30"
              >
                Join Adventure
              </button>
            )}
            <ThemeToggle className="inline-flex h-10 items-center gap-2 rounded-lg border border-green-400/50 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15" />
            {!loadingUser && user?.role === 'expert' && (
              <Link
                href="/experts/me#trail-requests"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-green-400/50 bg-white/10 hover:bg-white/15 self-center leading-none shrink-0"
                aria-label="View expert alerts"
                title="View trail request alerts"
              >
                <span className="text-sm" aria-hidden="true">🔔</span>
                {(alertsData?.unreadCount || 0) > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-green-900">
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
                className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-green-800 hover:bg-green-100"
              >
                Login
              </button>
            )}

            {!loadingUser && user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="ml-1 inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-green-400/50 bg-white/10 text-sm font-semibold uppercase hover:bg-white/15 self-center leading-none shrink-0 align-middle"
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

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl z-30">
                    <button
                      type="button"
                      onClick={handleViewProfile}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      View profile
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-3 flex flex-col gap-2 rounded-xl border border-green-600/60 bg-green-900/35 p-3">
            {[...navItems, ...navGroups.flatMap((group) => group.items)].map((item) =>
              canSeeItem(item) ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`truncate whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isNavItemActive(item.href)
                      ? 'bg-white text-green-900'
                      : 'text-green-50 hover:bg-white/15'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ) : null
            )}
            {!loadingUser && !user && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-amber-300/80 bg-amber-200/15 px-3 py-1.5 text-sm font-semibold text-amber-50"
                onClick={() => {
                  setMobileOpen(false);
                  setRegisterMessage(null);
                  setRegisterNext(null);
                  setRegisterOpen(true);
                }}
              >
                Join Adventure
              </button>
            )}
            <ThemeToggle className="inline-flex items-center gap-2 rounded-lg border border-green-500/70 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15" />
            {!loadingUser && user?.role === 'expert' && (
              <Link
                href="/experts/me#trail-requests"
                className="rounded-lg px-3 py-2.5 text-green-50 hover:bg-white/15"
                onClick={() => setMobileOpen(false)}
              >
                Alerts
                {(alertsData?.unreadCount || 0) > 0
                  ? ` (${alertsData?.unreadCount})`
                  : ''}
              </Link>
            )}
            {!loadingUser && !user && (
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-2.5 text-left font-semibold text-green-800"
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
                  className="rounded-lg px-3 py-2.5 text-left text-green-50 hover:bg-white/15"
                >
                  View profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left px-2 py-2 rounded text-red-200 hover:bg-green-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
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
