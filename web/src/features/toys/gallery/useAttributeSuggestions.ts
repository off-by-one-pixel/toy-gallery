'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { fetchAttributeSuggestions } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { useApiQuery } from '@/hooks/useApi';

export interface AttributeSuggestionsSource {
  keySuggestions: readonly string[];
  valuesFor: (key: string) => readonly string[];
  invalidateSuggestions: () => void;
}

export function useAttributeSuggestions(enabled: boolean): AttributeSuggestionsSource {
  const queryClient = useQueryClient();
  const { data } = useApiQuery({ key: queryKeys.toys.attributeSuggestions, fn: fetchAttributeSuggestions, enabled });
  const suggestions = useMemo(() => {
    const entries = data ?? [];
    return {
      keys: entries.map((entry) => entry.key),
      valuesByKey: new Map(entries.map((entry) => [entry.key.toLowerCase(), entry.values])),
    };
  }, [data]);
  return {
    keySuggestions: suggestions.keys,
    valuesFor: (key) => suggestions.valuesByKey.get(key.trim().toLowerCase()) ?? [],
    invalidateSuggestions: () => void queryClient.invalidateQueries({ queryKey: queryKeys.toys.attributeSuggestions }),
  };
}
