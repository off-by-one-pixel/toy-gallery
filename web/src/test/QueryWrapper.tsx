import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useState } from 'react';

import en from '@/i18n/catalogs/en.json';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });

export function QueryWrapper({ children, client }: Readonly<{ children: ReactNode; client?: QueryClient }>) {
  const [fallback] = useState(createTestQueryClient);
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={client ?? fallback}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}
