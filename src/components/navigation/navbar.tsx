'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  {
    label: 'Create Event',
    href: '/events/create',
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

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        setUser(data.user || null);
      } catch (error) {
        console.error('Error fetching user', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

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
      setUser(null);
      setMenuOpen(false);
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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            🚵 Local Guides
          </Link>
          <div className="flex items-center gap-6">
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
      </div>
    </nav>
  );
}
