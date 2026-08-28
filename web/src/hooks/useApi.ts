'use client';

import { useCallback } from 'react';

import { Toast } from '@heroui/react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { formatError } from '@/api/errors';

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

type ApiQueryOptions<T> = Omit<UseQueryOptions<T, unknown, T, QueryKey>, 'queryKey' | 'queryFn'> &
  Readonly<{ key: QueryKey; fn: () => Promise<T> }>;

export function useApiQuery<T>({ key, fn, ...options }: ApiQueryOptions<T>) {
  const { data, isPending, isError, isFetched, error } = useQuery({ queryKey: key, queryFn: fn, ...options });
  return { data, isPending, isError, isFetched, errorMessage: error ? formatError(error) : null };
}

type ApiInfiniteQueryOptions<TPage> = Readonly<{
  key: QueryKey;
  fn: (page: number) => Promise<TPage>;
  getNextPage: (lastPage: TPage, pages: TPage[]) => number | undefined;
}>;

export function useApiInfiniteQuery<TPage>({ key, fn, getNextPage }: ApiInfiniteQueryOptions<TPage>) {
  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage, error } = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fn(pageParam),
    initialPageParam: 1,
    getNextPageParam: getNextPage,
  });
  return {
    data,
    isPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    errorMessage: error ? formatError(error) : null,
  };
}

type ApiMutationOptions<TArgs, TResult> = Readonly<{
  fn: (args: TArgs) => Promise<TResult>;
  success?: (result: TResult) => string;
  invalidates?: readonly QueryKey[] | ((result: TResult) => readonly QueryKey[]);
  onSuccess?: (result: TResult) => void;
  onSettled?: () => void;
  errorSink?: (message: string) => void;
}>;

export interface ApiMutation<TArgs, TResult> {
  run: (args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
}

export function useApiMutation<TArgs = void, TResult = unknown>(
  options: ApiMutationOptions<TArgs, TResult>,
): ApiMutation<TArgs, TResult> {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: options.fn,
    onSuccess: (result) => {
      const message = options.success?.(result);
      if (message) Toast.toast.success(message);
      const keys =
        typeof options.invalidates === 'function' ? options.invalidates(result) : (options.invalidates ?? []);
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
      options.onSuccess?.(result);
    },
    onError: (err) => {
      const message = formatError(err);
      if (options.errorSink) options.errorSink(message);
      else Toast.toast.danger(message);
    },
    onSettled: options.onSettled,
  });
  const { mutateAsync, isPending } = mutation;
  const run = useCallback((args: TArgs) => mutateAsync(args).catch(() => undefined), [mutateAsync]);
  return { run, isPending };
}
