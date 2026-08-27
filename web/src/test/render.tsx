import type { QueryClient } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import en from '@/i18n/catalogs/en.json';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { GirthProvider } from '@/features/preferences/GirthProvider';
import { PrivacyProvider } from '@/features/preferences/PrivacyProvider';
import { ThemeProvider } from '@/features/preferences/ThemeProvider';
import { UnitProvider } from '@/features/preferences/UnitProvider';
import type { SortConfig } from '@/lib/sort';
import { SortProvider } from '@/providers/SortProvider';
import { QueryWrapper } from '@/test/QueryWrapper';

type Options = Readonly<{ client?: QueryClient; sort?: SortConfig }>;

export const withAppProviders = (ui: ReactNode, { client, sort }: Options = {}) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper client={client}>
      <ThemeProvider>
        <UnitProvider>
          <GirthProvider>
            <PrivacyProvider>
              <AuthProvider>{sort ? <SortProvider config={sort}>{ui}</SortProvider> : ui}</AuthProvider>
            </PrivacyProvider>
          </GirthProvider>
        </UnitProvider>
      </ThemeProvider>
    </QueryWrapper>
  </NextIntlClientProvider>
);
