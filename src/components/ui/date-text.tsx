'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

type DateTextProps = {
  value: string | Date | null | undefined;
  pattern?: string;
  fallback?: string;
  className?: string;
  title?: string;
};

/**
 * Hydration-safe date rendering:
 * - Server render outputs the same markup as the first client render (empty/fallback).
 * - We format only after mount so the user's locale/timezone is used without SSR/CSR mismatch.
 */
export default function DateText({
  value,
  pattern = 'PPP p',
  fallback = '—',
  className,
  title,
}: DateTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const text = useMemo(() => {
    if (!mounted) return '';
    if (!value) return fallback;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return format(date, pattern);
  }, [mounted, value, pattern, fallback]);

  return (
    <span className={className} title={title} suppressHydrationWarning>
      {text || (!mounted ? '' : fallback)}
    </span>
  );
}

