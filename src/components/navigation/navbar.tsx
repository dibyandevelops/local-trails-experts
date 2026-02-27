'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme-toggle';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQueryClient } from '@tanstack/react-query';

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
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stopColor="#166534" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="96" fill="url(#g)" />
    <path
      d="M74 344L174 206l64 68 78-104 122 174H74z"
      fill="#dcfce7"
      opacity="0.92"
    />
    <circle cx="350" cy="150" r="38" fill="#bbf7d0" />
  </svg>
);
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user = null, isLoading: loadingUser } = useCurrentUser();
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
