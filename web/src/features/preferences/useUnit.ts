'use client';

import { defaultUnit, Unit, unitById } from '@/features/preferences/units';
import { oneOf, usePersistedState } from '@/hooks/usePersistedState';

const isUnitId = oneOf(Object.values(Unit).map((unit) => unit.id));

export function useUnit() {
  const [unitId, setUnitId] = usePersistedState<Unit['id']>('units', defaultUnit.id, isUnitId);
  return { unit: unitById(unitId) ?? defaultUnit, setUnit: (unit: Unit) => setUnitId(unit.id) };
}
