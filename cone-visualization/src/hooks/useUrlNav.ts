'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Update = Record<string, string | null>;
type WriteOptions = Readonly<{ replace?: boolean }>;

/** Apply a partial update to the current search params: any value of
 *  `null` deletes the key, any string sets/replaces it. */
const applyUpdate = (current: URLSearchParams, update: Update): URLSearchParams => {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(update)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  return next;
};

const buildHref = (pathname: string, params: URLSearchParams): string => {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
};

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
      const next = applyUpdate(searchParams, update);
      const href = buildHref(pathname, next);
      if (options?.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, pathname, searchParams],
  );
}

/** Read a single search param, narrowed against an allowed-values
 *  array. Returns `null` when the param is absent or doesn't match. */
export function useEnumParam<T extends string>(key: string, allowed: readonly T[]): T | null {
  const raw = useSearchParams().get(key);
  return raw != null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Read a single integer search param. Returns `null` when absent or
 *  not a finite integer. */
export function useIntParam(key: string): number | null {
  const raw = useSearchParams().get(key);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}
