'use client'
import * as React from 'react';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface IMainContentProps { children: ReactNode }

const queryClient = new QueryClient()
const MainContent: React.FunctionComponent<IMainContentProps> = ({
  children,
}) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

export default MainContent;
