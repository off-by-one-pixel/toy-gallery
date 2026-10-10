// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';
import { usePresetPalette } from '@/features/toys/editor/usePresetPalette';

describe('usePresetPalette', () => {
  it('names each preset color from the catalog and keeps its value', () => {
    const { result } = renderHook(() => usePresetPalette(), { wrapper: QueryWrapper });
    expect(result.current).toEqual([
      { name: 'Purple', value: '#c4b5fd' },
      { name: 'Slate', value: '#475569' },
      { name: 'Blue', value: '#bae6fd' },
      { name: 'Red', value: '#fca5a5' },
      { name: 'Green', value: '#bbf7d0' },
    ]);
  });
});
