'use client';

import { useEffect, useState } from 'react';
import { UiState, useUiStore } from '@/stores/ui.store';

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
    : 'dark';
  applyTheme(nextTheme);
}

export default function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const theme = useUiStore((state: UiState) => state.theme);
  const setTheme = useUiStore((state: UiState) => state.setTheme);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: ThemeMode =
      stored === 'dark' || stored === 'light' ? stored : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, [setTheme]);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-lg border border-green-600 px-3 py-1.5 text-sm font-semibold hover:bg-green-700'
      }
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
      <span className="text-sm font-semibold">
        {!mounted ? 'Theme' : theme === 'dark' ? 'Light' : 'Dark'}
      </span>
      {!mounted || theme === 'dark' ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-yellow-200"
          aria-hidden="true"
        >
          <path
            d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 0 1-2 0V5.5a1 1 0 0 1 1-1Z"
            fill="currentColor"
          />
          <path
            d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
            fill="currentColor"
          />
          <path
            d="M5.6 7.1a1 1 0 0 1 1.4 0l1 1a1 1 0 1 1-1.4 1.4l-1-1a1 1 0 0 1 0-1.4ZM4.5 12a1 1 0 0 1 1-1H7a1 1 0 1 1 0 2H5.5a1 1 0 0 1-1-1ZM7 16.9a1 1 0 0 1 0 1.4l-1 1a1 1 0 1 1-1.4-1.4l1-1a1 1 0 0 1 1.4 0ZM12 17a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1ZM17 16.9a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1-1.4 1.4l-1-1a1 1 0 0 1 0-1.4ZM17 7.1a1 1 0 0 1 0 1.4l-1 1A1 1 0 1 1 14.6 8l1-1a1 1 0 0 1 1.4 0ZM18.5 11a1 1 0 0 1 0 2H17a1 1 0 1 1 0-2h1.5Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-slate-100"
          aria-hidden="true"
        >
          <path
            d="M20.2 14.5a7.5 7.5 0 0 1-9.7-9.7 1 1 0 0 0-1.3-1.2 9 9 0 1 0 12.2 12.2 1 1 0 0 0-1.2-1.3Z"
            fill="currentColor"
          />
          <path
            d="M16.7 5.2a1 1 0 0 0 0 1.4l.6.6-.6.6a1 1 0 1 0 1.4 1.4l.6-.6.6.6a1 1 0 1 0 1.4-1.4l-.6-.6.6-.6a1 1 0 1 0-1.4-1.4l-.6.6-.6-.6a1 1 0 0 0-1.4 0Z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}
