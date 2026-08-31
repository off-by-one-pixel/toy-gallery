// @vitest-environment happy-dom

import type { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchAttributeSuggestions: vi.fn(),
}));

import { fetchAttributeSuggestions } from '@/api';
import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import { settle } from '@/test/wait';
import { useAttributeSuggestions } from '@/features/toys/gallery/useAttributeSuggestions';

const renderSuggestions = (client: QueryClient = createTestQueryClient()) =>
  renderHook(() => useAttributeSuggestions(), {
    wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper>,
  });

describe('useAttributeSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAttributeSuggestions).mockResolvedValue([
      { key: 'Base', values: ['Suction'] },
      { key: 'Material', values: ['Glass', 'Silicone'] },
    ]);
  });

  it('loads the suggestions and answers key and value lookups', async () => {
    const { result } = renderSuggestions();
    await settle(() => expect(result.current.keySuggestions).toEqual(['Base', 'Material']));
    expect(result.current.valuesFor('material')).toEqual(['Glass', 'Silicone']);
    expect(result.current.valuesFor('unknown')).toEqual([]);
  });

  it('starts empty while loading', () => {
    const { result } = renderSuggestions();
    expect(result.current.keySuggestions).toEqual([]);
    expect(result.current.valuesFor('Material')).toEqual([]);
  });

  it('invalidates the suggestions query on demand', async () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderSuggestions(client);
    await settle(() => expect(result.current.keySuggestions).toEqual(['Base', 'Material']));
    result.current.invalidateSuggestions();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['toys', 'attributeSuggestions'] });
  });
});
