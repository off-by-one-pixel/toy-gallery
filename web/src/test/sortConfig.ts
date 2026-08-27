import { expect } from 'vitest';

import { isColumnOf, type SortConfig } from '@/lib/sort';

export const expectSortConfigGuard = (config: SortConfig, rejected: readonly unknown[]): void => {
  for (const column of config.columns) expect(isColumnOf(config, column)).toBe(true);
  for (const value of rejected) expect(isColumnOf(config, value)).toBe(false);
};
