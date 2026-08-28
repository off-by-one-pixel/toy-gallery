// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@heroui/react', () => ({
  Toast: { toast: { danger: vi.fn(), success: vi.fn() } },
}));

import { Toast } from '@heroui/react';

import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';

const makeWrapper = (client: QueryClient) =>
  function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return <QueryWrapper client={client}>{children}</QueryWrapper>;
  };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useApiMutation', () => {
  it('runs the call, toasts the success message, invalidates, then notifies', async () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () =>
        useApiMutation({
          fn: async (n: number) => n * 2,
          success: (value) => `did ${value}`,
          invalidates: [['toys']],
          onSuccess,
        }),
      { wrapper: makeWrapper(client) },
    );

    await act(async () => {
      await expect(result.current.run(21)).resolves.toBe(42);
    });
    expect(Toast.toast.success).toHaveBeenCalledWith('did 42');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['toys'] });
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it('stays silent on success without a message and derives invalidations from the result', async () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(
      () =>
        useApiMutation({
          fn: async () => 7,
          invalidates: (value) => [['sessions', 'detail', value]],
        }),
      { wrapper: makeWrapper(client) },
    );

    await act(async () => {
      await result.current.run();
    });
    expect(Toast.toast.success).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 7] });
  });

  it('toasts the formatted error and resolves undefined', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useApiMutation({
          fn: async () => {
            throw new Error('boom');
          },
          success: () => 'never',
        }),
      { wrapper: makeWrapper(client) },
    );

    await act(async () => {
      await expect(result.current.run()).resolves.toBeUndefined();
    });
    expect(Toast.toast.danger).toHaveBeenCalledWith('boom');
    expect(Toast.toast.success).not.toHaveBeenCalled();
  });

  it('routes errors into the sink instead of toasting', async () => {
    const client = createTestQueryClient();
    const errorSink = vi.fn();
    const { result } = renderHook(
      () =>
        useApiMutation({
          fn: async () => {
            throw new Error('boom');
          },
          errorSink,
        }),
      { wrapper: makeWrapper(client) },
    );

    await act(async () => {
      await result.current.run();
    });
    expect(errorSink).toHaveBeenCalledWith('boom');
    expect(Toast.toast.danger).not.toHaveBeenCalled();
  });

  it('reports pending state while the call runs', async () => {
    const client = createTestQueryClient();
    let resolveCall!: () => void;
    const { result } = renderHook(
      () =>
        useApiMutation({
          fn: () =>
            new Promise<void>((resolve) => {
              resolveCall = resolve;
            }),
        }),
      { wrapper: makeWrapper(client) },
    );

    void result.current.run();
    await waitFor(() => expect(result.current.isPending).toBe(true));
    resolveCall();
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});

describe('useApiQuery', () => {
  it('exposes the data with a null error message on success', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useApiQuery({ key: ['thing'], fn: async () => 'value' }), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.data).toBe('value'));
    expect(result.current.errorMessage).toBeNull();
  });

  it('exposes a formatted error message on failure', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useApiQuery({
          key: ['thing'],
          fn: async () => {
            throw new Error('boom');
          },
        }),
      { wrapper: makeWrapper(client) },
    );
    await waitFor(() => expect(result.current.errorMessage).toBe('boom'));
  });
});
