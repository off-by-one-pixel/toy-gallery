'use client';

import { useCallback, useMemo } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type Update = Record<string, string | null>;

export type WriteOptions = Readonly<{ replace?: boolean }>;

export function applyUpdate(current: URLSearchParams, update: Update): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(update)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  return next;
}

export function buildHref(pathname: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function parseEnumParam<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

export function parseIntParam(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export interface Navigation {
  pathname: string;
  searchParams: URLSearchParams;
  param: (key: string) => string | null;
  navigate: (href: string) => void;
  replace: (href: string) => void;
  updateParams: (update: Update, options?: WriteOptions) => void;
}

export function useNavigation(): Navigation {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (update: Update, options?: WriteOptions) => {
      const href = buildHref(pathname, applyUpdate(searchParams, update));
      if (options?.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return useMemo(
    () => ({
      pathname,
      searchParams,
      param: (key: string) => searchParams.get(key),
      navigate: (href: string) => router.push(href),
      replace: (href: string) => router.replace(href),
      updateParams,
    }),
    [pathname, searchParams, router, updateParams],
  );
}
