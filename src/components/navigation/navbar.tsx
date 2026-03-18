'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, UserRole } from '@/types';
import LoginModal from '@/components/auth/login-modal';
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
    label: 'Explore',
    items: [
      { label: 'Events', href: '/events', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Experts', href: '/experts', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
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
  { label: 'Search Trails', href: '/trails', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
  { label: 'For Experts', href: '/experts/join', showFor: ['anonymous'] },
];
const icon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    role="img"
    aria-label="LOCOXPERTS"
    className="h-10 w-10 shrink-0"
  >
    <defs>
      <linearGradient id="navbg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#14532d" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>

    <rect width="512" height="512" rx="96" fill="url(#navbg)" />

    <path d="M24 210L84 170L136 212L192 176L250 224L314 184L374 232L434 186L488 220" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="14" strokeLinecap="round" />
    <path d="M24 286L82 246L142 300L198 254L258 312L322 264L382 318L440 272L488 324" fill="none" stroke="#fff" strokeOpacity=".26" strokeWidth="15" strokeLinecap="round" />
    <path d="M24 360L84 324L146 382L206 334L266 390L330 344L392 398L452 354L488 404" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="16" strokeLinecap="round" />
    <path d="M40 484L90 444L140 462L186 396L246 414L304 334L362 352L424 274L488 292" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="14" strokeLinecap="round" />
    <path d="M28 48L86 92L134 74L192 132L246 112L306 170L364 152L426 208L484 192" fill="none" stroke="#fff" strokeOpacity=".21" strokeWidth="13" strokeLinecap="round" />
    <path d="M488 64L434 120L386 102L328 160L278 142L220 198L164 182L108 238L44 220" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="12" strokeLinecap="round" />
    <path d="M488 428L436 382L386 408L330 350L282 376L226 320L172 348L118 292L56 320" fill="none" stroke="#fff" strokeOpacity=".24" strokeWidth="13" strokeLinecap="round" />
    <path d="M258 28L276 82L232 126L294 170L248 216L312 262L266 306L330 352L286 410L338 484" fill="none" stroke="#fff" strokeOpacity=".19" strokeWidth="12" strokeLinecap="round" />

    <g fill="#f0fdf4" fontFamily="Inter, Segoe UI, Arial, sans-serif" fontWeight="800" letterSpacing="1.2">
      <text x="52" y="220" fontSize="96">LOCO</text>
      <text x="52" y="330" fontSize="96">XPERTS</text>
    </g>

    <circle cx="428" cy="186" r="44" fill="#22c55e" />
    <circle cx="428" cy="186" r="39" fill="none" stroke="#bbf7d0" strokeWidth="5" />
    <path d="M409 186l15 15 29-29" fill="none" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />

  </svg>
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
  const [loginInitialRole, setLoginInitialRole] = useState<UserRole | undefined>(undefined);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loginNext, setLoginNext] = useState<string | null>(null);
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
        url.searchParams.delete('role');
        url.searchParams.delete('message');
        url.searchParams.delete('next');
        const nextUrl = `${url.pathname}${url.search ? url.search : ''}${url.hash ? url.hash : ''}`;
        window.history.replaceState(null, '', nextUrl);
      }
      return;
    }

    const errorParam = searchParams.get('error');
    const errorMessage =
      errorParam === 'strava_denied'
        ? 'Strava authorization was cancelled.'
        : errorParam === 'strava_expert_only'
          ? 'Strava connect is available for experts only.'
          : errorParam
            ? 'Could not connect to Strava. Please try again.'
            : null;

    const roleParam = searchParams.get('role');
    const initialRole: UserRole | undefined =
      roleParam === 'admin' || roleParam === 'expert' || roleParam === 'participant'
        ? roleParam
        : undefined;
    setLoginInitialRole(initialRole);
    setLoginMessage(searchParams.get('message') || errorMessage);
    setLoginNext(searchParams.get('next'));
    setLoginOpen(true);

    // Strip login-related params so refresh/back doesn't keep reopening the modal.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('role');
      url.searchParams.delete('message');
      url.searchParams.delete('next');
      const nextUrl = `${url.pathname}${url.search ? url.search : ''}${url.hash ? url.hash : ''}`;
      window.history.replaceState(null, '', nextUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), user?.id]);

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
    <nav className="relative z-20 bg-green-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-5">
        <div className="flex min-h-[56px] items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 text-2xl font-bold leading-none">
            {icon}
            <span>LocoXperts</span>
          </Link>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded border border-green-600 hover:bg-green-700"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) =>
              canSeeItem(item) ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex h-9 items-center rounded-md px-2 py-1 text-sm font-semibold transition-colors ${
                    isNavItemActive(item.href) ? 'bg-green-700 text-white' : 'hover:text-green-200'
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
                        className={`inline-flex h-9 items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold transition-colors ${
                          groupActive ? 'bg-green-700 text-white' : 'hover:text-green-200'
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
                        className="z-30 flex w-52 flex-col gap-1 rounded-lg border border-green-700/60 bg-green-900/95 p-2 text-sm text-white shadow-lg"
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
                              className={`block rounded-md px-3 py-2 text-sm font-semibold outline-none transition ${
                                isNavItemActive(item.href)
                                  ? 'bg-green-700 text-white'
                                  : 'hover:bg-green-700 data-[highlighted]:bg-green-700'
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
              <Link
                href="/register"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-300/80 bg-amber-200/15 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-200/25"
              >
                Join Adventure
              </Link>
            )}
            <ThemeToggle className="inline-flex h-9 items-center gap-2 rounded-lg border border-green-600 px-3 py-1.5 text-sm font-semibold hover:bg-green-700" />
            {!loadingUser && user?.role === 'expert' && (
              <Link
                href="/experts/me#trail-requests"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-600 bg-green-700 hover:bg-green-600 self-center leading-none shrink-0"
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
                  setLoginInitialRole(undefined);
                  setLoginMessage(null);
                  setLoginNext(null);
                  setLoginOpen(true);
                }}
                className="inline-flex h-9 items-center justify-center px-3 py-1.5 rounded-lg bg-white text-green-800 text-sm font-semibold hover:bg-green-100"
              >
                Login
              </button>
            )}

            {!loadingUser && user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="ml-2 inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-green-700 text-sm font-semibold uppercase border border-green-600 hover:bg-green-600 self-center leading-none shrink-0 align-middle"
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
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg z-30">
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
          <div className="md:hidden mt-4 flex flex-col gap-2 border-t border-green-700 pt-3">
            {[...navItems, ...navGroups.flatMap((group) => group.items)].map((item) =>
              canSeeItem(item) ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`truncate whitespace-nowrap px-2 py-2 rounded text-sm font-semibold transition-colors ${
                    isNavItemActive(item.href)
                      ? 'bg-green-700 text-white'
                      : 'hover:bg-green-700'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ) : null
            )}
            {!loadingUser && !user && (
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg border border-amber-300/80 bg-amber-200/15 px-3 py-1.5 text-sm font-semibold text-amber-50"
                onClick={() => setMobileOpen(false)}
              >
                Join Adventure
              </Link>
            )}
            <ThemeToggle className="inline-flex items-center gap-2 rounded border border-green-600 px-3 py-1.5 text-sm font-semibold hover:bg-green-700" />
            {!loadingUser && user?.role === 'expert' && (
              <Link
                href="/experts/me#trail-requests"
                className="rounded px-2 py-2 hover:bg-green-700"
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
                className="px-2 py-2 rounded bg-white text-green-800 font-semibold text-left"
                onClick={() => {
                  setMobileOpen(false);
                  setLoginInitialRole(undefined);
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
                  className="text-left px-2 py-2 rounded hover:bg-green-700"
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
        initialRole={loginInitialRole}
        message={loginMessage}
        next={loginNext}
      />
    </nav>
  );
}
