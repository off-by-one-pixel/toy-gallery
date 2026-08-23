'use client';

import { useEffect, useState } from 'react';

const matches = (query: string): boolean =>
  globalThis.window !== undefined && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = () => setValue(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return value;
}
