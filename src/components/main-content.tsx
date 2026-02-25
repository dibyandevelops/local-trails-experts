'use client'
import * as React from 'react';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

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
      queryClient.invalidateQueries({ queryKey: ['me'] });
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
    <AuthQuerySync />
    {children}
  </QueryClientProvider>
);

export default MainContent;
