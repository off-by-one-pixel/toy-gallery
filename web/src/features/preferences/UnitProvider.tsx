'use client';

import { useMemo } from 'react';

import { defaultUnit, Unit, unitById } from '@/features/preferences/units';
import { oneOf } from '@/hooks/usePersistedState';
import { createPersistedProvider } from '@/providers/createPersistedProvider';

interface UnitContextValue {
  unit: Unit;
  setUnit: (unit: Unit) => void;
}

const { Provider, useValue } = createPersistedProvider<Unit['id']>({
  storageKey: 'units',
  defaultValue: defaultUnit.id,
  isValid: oneOf(Object.values(Unit).map((unit) => unit.id)),
  errorMessage: 'useUnit must be used within UnitProvider',
});

export const UnitProvider = Provider;

export function useUnit(): UnitContextValue {
  const { value, setValue } = useValue();
  return useMemo(
    () => ({ unit: unitById(value) ?? defaultUnit, setUnit: (unit: Unit) => setValue(unit.id) }),
    [value, setValue],
  );
}
