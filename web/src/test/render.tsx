import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/features/auth/AuthProvider';
import type { SortConfig } from '@/lib/sort';
import { SortProvider } from '@/providers/SortProvider';
import { QueryWrapper } from '@/test/QueryWrapper';

type Options = Readonly<{ client?: QueryClient; sort?: SortConfig }>;

export const withAppProviders = (ui: ReactNode, { client, sort }: Options = {}) => (
  <QueryWrapper client={client}>
    <AuthProvider>{sort ? <SortProvider config={sort}>{ui}</SortProvider> : ui}</AuthProvider>
  </QueryWrapper>
);

export const appWrapper = (client: QueryClient, { sort }: Omit<Options, 'client'> = {}) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return withAppProviders(children, { client, sort });
  };
