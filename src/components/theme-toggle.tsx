'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'mtb_theme';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const nextTheme: ThemeMode = stored === 'dark' || stored === 'light'
    ? stored
    : getSystemTheme();
  applyTheme(nextTheme);
}

export default function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const nextTheme: ThemeMode = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
    setTheme(nextTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className || 'rounded-lg border border-green-600 px-3 py-1.5 text-sm hover:bg-green-700'}
      aria-label={
        (mounted ? theme : 'light') === 'dark'
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      title={
        (mounted ? theme : 'light') === 'dark'
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
    >
      {!mounted ? 'Theme' : theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
