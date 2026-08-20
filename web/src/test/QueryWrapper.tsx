import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export function QueryWrapper({ children, client }: Readonly<{ children: ReactNode; client?: QueryClient }>) {
  const [fallback] = useState(createTestQueryClient);
  return <QueryClientProvider client={client ?? fallback}>{children}</QueryClientProvider>;
}
