'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';

type NavItem = {
  label: string;
  href: string;
  requiresAuth?: boolean;
  requiresRole?: Array<'admin' | 'expert' | 'participant'>;
  showFor?: Array<'anonymous' | 'admin' | 'expert' | 'participant'>;
};

const navItems: NavItem[] = [
  { label: 'Search Trails', href: '/trails' },
  { label: 'Events', href: '/events' },
  { label: 'Join Experts', href: '/register', showFor: ['anonymous'] },
  {
    label: 'Create Event',
    href: '/events/create',
    requiresAuth: true,
    requiresRole: ['admin', 'expert'],
  },
  {
    label: 'Create Trail',
    href: '/trails/create',
    requiresAuth: true,
    requiresRole: ['admin', 'expert'],
  },
  {
    label: 'Organize Trainings',
    href: '/events/trainings/create',
    requiresAuth: true,
    requiresRole: ['admin', 'expert'],
  },
  { label: 'Experts', href: '/experts' },
  {
    label: 'For Experts',
    href: '/experts/join',
    showFor: ['anonymous', 'admin'],
  },
];
const icon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    role="img"
    aria-label="Local Guides"
    className="h-8 w-8 shrink-0"
  >
    <defs>
      <linearGradient id="navbg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#14532d" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="112" fill="url(#navbg)" />
    <path d="M44 220L94 184L142 222L194 188L242 230L296 194L350 236L408 190L468 232" fill="none" stroke="#ffffff" strokeOpacity=".24" strokeWidth="13" strokeLinecap="round" />
    <path d="M44 286L92 248L146 288L200 248L252 294L306 252L362 300L422 256L468 304" fill="none" stroke="#ffffff" strokeOpacity=".29" strokeWidth="14" strokeLinecap="round" />
    <path d="M44 350L94 314L148 354L204 312L256 358L312 316L368 364L430 322L468 368" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="15" strokeLinecap="round" />
    <path d="M58 468L102 436L148 450L188 396L238 412L292 344L344 360L398 294L468 310" fill="none" stroke="#ffffff" strokeOpacity=".32" strokeWidth="13" strokeLinecap="round" />
    <path d="M48 66L98 104L142 90L194 138L242 122L296 172L350 158L406 212L462 196" fill="none" stroke="#ffffff" strokeOpacity=".25" strokeWidth="12" strokeLinecap="round" />
    <path d="M468 84L418 130L374 114L320 162L274 148L222 196L170 182L116 234L58 220" fill="none" stroke="#ffffff" strokeOpacity=".23" strokeWidth="11" strokeLinecap="round" />
    <path d="M468 406L418 364L372 388L320 342L274 364L224 318L176 340L124 292L66 314" fill="none" stroke="#ffffff" strokeOpacity=".28" strokeWidth="12" strokeLinecap="round" />
    <path d="M256 46L272 92L234 126L288 164L250 204L304 244L266 286L320 326L282 378L330 466" fill="none" stroke="#ffffff" strokeOpacity=".22" strokeWidth="11" strokeLinecap="round" />
    <path d="M256 92c-62 0-112 50-112 112 0 82 86 167 102 183a14 14 0 0 0 20 0c16-16 102-101 102-183 0-62-50-112-112-112z" fill="#f0fdf4" />
    <circle cx="256" cy="214" r="48" fill="#22c55e" />
    <circle cx="256" cy="214" r="26" fill="#f0fdf4" />
    <path d="M243 214l12 12 24-24" fill="none" stroke="#166534" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
type NavbarProps = {
  initialUser?: User | null;
};

export default function Navbar({ initialUser = null }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

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
      router.push('/login');
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

  const initial =
    user?.name?.trim()?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-5">
        <div className="flex min-h-[56px] items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold leading-none">
            {icon}
            <span className="pt-0.5">Local Guides</span>
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
                  className="hover:text-green-200 transition-colors"
                >
                  {item.label}
                </Link>
              ) : null
            )}
            <ThemeToggle className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-green-600 text-sm font-semibold hover:bg-green-700" />
            {!loadingUser && user?.role === 'expert' && (
              <Link
                href="/experts/me#trail-requests"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-green-600 bg-green-700 hover:bg-green-600"
                aria-label="View expert alerts"
                title="View trail request alerts"
              >
                <span className="text-sm" aria-hidden="true">
                  🔔
                </span>
                {(alertsData?.unreadCount || 0) > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-green-900">
                    {alertsData?.unreadCount}
                  </span>
                )}
              </Link>
            )}

            {!loadingUser && !user && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white text-green-800 text-sm font-semibold hover:bg-green-100"
              >
                Login
              </Link>
            )}

            {!loadingUser && user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-sm font-semibold uppercase border border-green-600 hover:bg-green-600"
                  aria-label="User menu"
                >
                  {initial}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg">
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
            {navItems.map((item) =>
              canSeeItem(item) ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 py-2 rounded hover:bg-green-700 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ) : null
            )}
            <ThemeToggle className="text-left px-2 py-2 rounded border border-green-600 hover:bg-green-700" />
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
              <Link
                href="/login"
                className="px-2 py-2 rounded bg-white text-green-800 font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Login
              </Link>
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
    </nav>
  );
}
