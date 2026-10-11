import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePersistedState } from '@/hooks/usePersistedState';

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const NO_ITEMS: string[] = [];

const render = () => renderHook(() => usePersistedState('test.items', NO_ITEMS, isStringList));

describe('usePersistedState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts from the default when nothing is stored', () => {
    const { result } = render();
    expect(result.current[0]).toEqual([]);
  });

  it('hydrates the stored value on mount', () => {
    localStorage.setItem('test.items', JSON.stringify(['a', 'b']));
    const { result } = render();
    expect(result.current[0]).toEqual(['a', 'b']);
  });

  it('keeps the default when the stored value fails validation', () => {
    localStorage.setItem('test.items', JSON.stringify(['a', 1]));
    const { result } = render();
    expect(result.current[0]).toEqual([]);
  });

  it('keeps the default when storage is unparsable', () => {
    localStorage.setItem('test.items', '{not json');
    const { result } = render();
    expect(result.current[0]).toEqual([]);
  });

  it('persists the value as JSON on set', () => {
    const { result } = render();
    act(() => result.current[1](['a']));
    expect(localStorage.getItem('test.items')).toBe(JSON.stringify(['a']));
  });

  it('does not write to storage on mere hydration', () => {
    const { result } = render();
    expect(result.current[0]).toEqual([]);
    expect(localStorage.getItem('test.items')).toBeNull();
  });

  it('supports functional updates against the latest value', () => {
    localStorage.setItem('test.items', JSON.stringify(['a']));
    const { result } = render();
    act(() => {
      result.current[1]((current) => [...current, 'b']);
      result.current[1]((current) => [...current, 'c']);
    });
    expect(result.current[0]).toEqual(['a', 'b', 'c']);
    expect(localStorage.getItem('test.items')).toBe(JSON.stringify(['a', 'b', 'c']));
  });

  it('keeps every hook that shares a key in sync', () => {
    const first = render();
    const second = render();
    act(() => first.result.current[1](['a']));
    expect(second.result.current[0]).toEqual(['a']);
  });

  it('renders the default on the server so hydration matches', () => {
    localStorage.setItem('test.items', JSON.stringify(['a']));
    function Probe() {
      const [items] = usePersistedState('test.items', NO_ITEMS, isStringList);
      return <span>{items.length}</span>;
    }
    expect(renderToString(<Probe />)).toBe('<span>0</span>');
  });
});
