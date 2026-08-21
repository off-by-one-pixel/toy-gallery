import { useCallback } from 'react';

import { Toast } from '@heroui/react';
import { formatError } from '@/services/errors';

export function useReportError(inlineSink?: (message: string) => void): (err: unknown) => void {
  return useCallback(
    (err: unknown) => {
      const message = formatError(err);
      if (inlineSink) inlineSink(message);
      else Toast.toast.danger(message);
    },
    [inlineSink],
  );
}

interface AsyncActionOpts<T> {
  busy?: (isBusy: boolean) => void;
  onSuccess?: (value: T) => void;
  onDone?: () => void;
}

export function useAsyncAction(
  inlineSink?: (message: string) => void,
): <T>(fn: () => Promise<T>, opts?: AsyncActionOpts<T>) => Promise<T | undefined> {
  const report = useReportError(inlineSink);
  return useCallback(
    async <T>(fn: () => Promise<T>, opts: AsyncActionOpts<T> = {}) => {
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
