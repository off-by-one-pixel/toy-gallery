import { useCallback } from 'react';

import { useToasts } from '../providers/ToastProvider';
import { formatError } from '../services/errors';

/**
 * Formats an unknown error via `formatError` and reports it either inline
 * (via the supplied setter) or as a toast if no setter is provided.
 */
export function useReportError(
  inlineSink?: (message: string) => void,
): (err: unknown) => void {
  const { showToast } = useToasts();
  return useCallback(
    (err: unknown) => {
      const message = formatError(err);
      if (inlineSink) inlineSink(message);
      else showToast(message, 'error');
    },
    [inlineSink, showToast],
  );
}

interface AsyncActionOpts<T> {
  /** Called with `true` before the call and `false` after (success or error). */
  busy?: (isBusy: boolean) => void;
  /** Called only on success, with the resolved value. */
  onSuccess?: (value: T) => void;
  /** Called after success AND after error. Use for cleanup / refetch triggers. */
  onDone?: () => void;
}

/**
 * Runs an async function with the standard try / catch / finally scaffold:
 * set busy on, await, report errors, flip busy off. The `inlineSink` argument
 * has the same meaning as `useReportError` — pass a setter for inline error
 * display, omit for a toast.
 */
export function useAsyncAction(
  inlineSink?: (message: string) => void,
): <T>(fn: () => Promise<T>, opts?: AsyncActionOpts<T>) => Promise<T | undefined> {
  const report = useReportError(inlineSink);
  return useCallback(
    async <T,>(fn: () => Promise<T>, opts: AsyncActionOpts<T> = {}) => {
      opts.busy?.(true);
      try {
        const value = await fn();
        opts.onSuccess?.(value);
        return value;
      } catch (err) {
        report(err);
        return undefined;
      } finally {
        opts.busy?.(false);
        opts.onDone?.();
      }
    },
    [report],
  );
}
