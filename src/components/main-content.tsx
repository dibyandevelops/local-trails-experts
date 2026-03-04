'use client'
import * as React from 'react';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/services/constants/query-keys';
import AppErrorBoundary from '@/components/app-error-boundary';
import ClientErrorReporter from '@/components/client-error-reporter';

interface IMainContentProps { children: ReactNode }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthQuerySync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const onAuthChanged = () => {
      queryClient.removeQueries({ queryKey: QUERY_KEYS.auth.me });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.me });
      queryClient.refetchQueries({
        queryKey: QUERY_KEYS.auth.me,
        type: 'active',
      });
    };
    window.addEventListener('auth-changed', onAuthChanged);
    return () => window.removeEventListener('auth-changed', onAuthChanged);
  }, [queryClient]);

  return null;
}
const MainContent: React.FunctionComponent<IMainContentProps> = ({
  children,
}) => (
  <QueryClientProvider client={queryClient}>
    <ClientErrorReporter />
    <AuthQuerySync />
    <AppErrorBoundary>{children}</AppErrorBoundary>
  </QueryClientProvider>
);

export default MainContent;
