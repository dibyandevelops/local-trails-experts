'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/services/auth/auth.service';
import type { User } from '@/types';
import { QUERY_KEYS } from '@/services/constants/query-keys';

type UseCurrentUserOptions = {
  enabled?: boolean;
};

function hasAuthHintCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry.startsWith('mtb_auth_hint=1'));
}

function hasOAuthConnectedMarker() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('strava') === 'connected';
}

export function useCurrentUser(
  initialData?: User | null,
  options?: UseCurrentUserOptions
) {
  const [authHint, setAuthHint] = useState<boolean>(false);

  useEffect(() => {
    const syncHint = () => setAuthHint(hasAuthHintCookie() || hasOAuthConnectedMarker());
    syncHint();
    window.addEventListener('auth-changed', syncHint);
    return () => window.removeEventListener('auth-changed', syncHint);
  }, []);

  const enabledByDefault = options?.enabled ?? true;
  const shouldFetch = enabledByDefault && (Boolean(initialData) || authHint);

  return useQuery<User | null>({
    queryKey: QUERY_KEYS.auth.me,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    enabled: shouldFetch,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
    initialData,
    placeholderData: (previousData) => previousData,
  });
}
