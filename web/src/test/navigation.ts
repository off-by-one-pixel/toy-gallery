import { vi } from 'vitest';

import type { Navigation, Update, WriteOptions } from '@/hooks/useNavigation';

export const navState = {
  pathname: '/',
  search: '',
};

export const navigateMock = vi.fn();
export const replaceMock = vi.fn();
export const backOrMock = vi.fn();
export const updateParamsMock = vi.fn((update: Update, _options?: WriteOptions) => {
  const next = new URLSearchParams(navState.search);
  for (const [key, value] of Object.entries(update)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  navState.search = next.toString();
});

export const resetNavigation = (): void => {
  navState.pathname = '/';
  navState.search = '';
  navigateMock.mockClear();
  replaceMock.mockClear();
  backOrMock.mockClear();
  updateParamsMock.mockClear();
};

export const testNavigation = (): Navigation => ({
  pathname: navState.pathname,
  searchParams: new URLSearchParams(navState.search),
  param: (key: string) => new URLSearchParams(navState.search).get(key),
  navigate: navigateMock,
  replace: replaceMock,
  backOr: backOrMock,
  updateParams: updateParamsMock,
});
