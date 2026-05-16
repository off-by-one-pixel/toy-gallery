'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type Update = Record<string, string | null>;
type WriteOptions = Readonly<{ replace?: boolean }>;

/** Apply a partial update to the current search params: any value of
 *  `null` deletes the key, any string sets/replaces it. Pure. */
export function applyUpdate(current: URLSearchParams, update: Update): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(update)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  return next;
}

/** Build a path + search-params URL string. Drops the `?` when there
 *  are no params. Pure. */
export function buildHref(pathname: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Narrow a raw search-param value against an allowed-values array.
 *  Returns `null` when absent or not in the list. Pure. */
export function parseEnumParam<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Parse a raw search-param value as an integer. Returns `null` when
 *  absent, empty, or not a finite integer. Pure. */
export function parseIntParam(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

/** Returns a setter that updates one or more URL search params on the
 *  current pathname. By default a `push` (so browser-back undoes it);
 *  pass `{ replace: true }` for same-level edits that shouldn't add a
 *  history entry. Always preserves params not mentioned in `update`. */
export function useUrlUpdate(): (update: Update, options?: WriteOptions) => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useCallback(
    (update, options) => {
      const href = buildHref(pathname, applyUpdate(searchParams, update));
      if (options?.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/** Read a single search param, narrowed against an allowed-values
 *  array. Returns `null` when the param is absent or doesn't match. */
export function useEnumParam<T extends string>(key: string, allowed: readonly T[]): T | null {
  return parseEnumParam(useSearchParams().get(key), allowed);
}

/** Read a single integer search param. Returns `null` when absent or
 *  not a finite integer. */
export function useIntParam(key: string): number | null {
  return parseIntParam(useSearchParams().get(key));
}
