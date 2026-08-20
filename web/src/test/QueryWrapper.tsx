import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
  const [client] = useState(createTestQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
