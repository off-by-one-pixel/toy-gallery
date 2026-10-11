import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { THEMES } from '@/features/preferences/themeRegistry';
import { useTheme } from '@/features/preferences/useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.head.innerHTML = '<meta name="theme-color" content="">';
  });

  it('defaults to light and reads a stored theme', () => {
    expect(renderHook(() => useTheme()).result.current.theme).toBe('light');
    localStorage.setItem('theme', JSON.stringify('dark'));
    expect(renderHook(() => useTheme()).result.current.theme).toBe('dark');
  });

  it('persists the theme and applies it to the document and browser chrome', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe(JSON.stringify('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(THEMES.dark.browserChrome);
  });
});
