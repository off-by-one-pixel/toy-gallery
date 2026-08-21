'use client';

import { useMemo } from 'react';

import { defaultUnit, Unit, unitById } from '@/features/preferences/units';
import { createPersistedProvider } from '@/providers/createPersistedProvider';

interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
}

const { Provider, useValue } = createPersistedProvider<Unit>({
  storageKey: 'units',
  defaultValue: defaultUnit,
  decode: unitById,
  encode: (unit) => unit.id,
  errorMessage: 'useUnit must be used within UnitProvider',
});

export const UnitProvider = Provider;

export function useUnit(): UnitContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ unit: value, setUnit: setValue }), [value, setValue]);
}
