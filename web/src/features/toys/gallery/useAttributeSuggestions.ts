'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { fetchAttributeSuggestions } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { NO_SUGGESTIONS, suggestedValues, toAttributeSuggestions } from '@/features/toys/gallery/attributesEditor';
import { useApiQuery } from '@/hooks/useApi';

export interface AttributeSuggestionsSource {
  keySuggestions: readonly string[];
  valuesFor: (key: string) => readonly string[];
  invalidateSuggestions: () => void;
}

export function useAttributeSuggestions(): AttributeSuggestionsSource {
  const queryClient = useQueryClient();
  const { data } = useApiQuery({ key: queryKeys.toys.attributeSuggestions, fn: fetchAttributeSuggestions });
  const suggestions = useMemo(() => (data ? toAttributeSuggestions(data) : NO_SUGGESTIONS), [data]);
  return {
    keySuggestions: suggestions.keys,
    valuesFor: (key) => suggestedValues(suggestions, key),
    invalidateSuggestions: () => void queryClient.invalidateQueries({ queryKey: queryKeys.toys.attributeSuggestions }),
  };
}
