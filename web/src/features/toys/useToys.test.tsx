// @vitest-environment happy-dom

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { settle } from '@/test/wait';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchToys: vi.fn(),
  deleteToy: vi.fn(),
  createToy: vi.fn(),
  patchToy: vi.fn(),
}));

import { createToy, deleteToy, fetchToys, patchToy } from '@/api';
import { makeToy } from '@/test/fixtures';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';
import { useToys } from '@/features/toys/useToys';

const makeWrapper = (client: QueryClient) =>
  function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return withAppProviders(children, { client });
  };

const renderToys = (client: QueryClient = createTestQueryClient()) =>
  renderHook(() => useToys(), { wrapper: makeWrapper(client) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchToys).mockResolvedValue([makeToy({ id: 1 })]);
});

describe('useToys', () => {
  it('loads the toys', async () => {
    const { result } = renderToys();
    await settle(() => expect(result.current.toys).toEqual([makeToy({ id: 1 })]));
    expect(result.current.error).toBeNull();
  });

  it('exposes a formatted load error', async () => {
    vi.mocked(fetchToys).mockRejectedValue(new Error('boom'));
    const { result } = renderToys();
    await settle(() => expect(result.current.error).toBe('boom'));
    expect(result.current.toys).toEqual([]);
  });

  it('creates a new toy and refreshes the collection', async () => {
    vi.mocked(createToy).mockResolvedValue(makeToy({ id: 7 }));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderToys(client);
    await act(async () => {
      await expect(result.current.saveToy({ toyId: null, payload: {} as never })).resolves.toEqual(makeToy({ id: 7 }));
    });
    expect(createToy).toHaveBeenCalledTimes(1);
    expect(patchToy).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['toys'] });
  });

  it('patches an existing toy on save', async () => {
    vi.mocked(patchToy).mockResolvedValue(makeToy({ id: 7 }));
    const { result } = renderToys();
    await act(async () => {
      await result.current.saveToy({ toyId: 7, payload: {} as never });
    });
    expect(vi.mocked(patchToy).mock.calls[0][0]).toBe(7);
    expect(createToy).not.toHaveBeenCalled();
  });

  it('routes save errors into the provided sink', async () => {
    vi.mocked(createToy).mockRejectedValue(new Error('boom'));
    const saveErrorSink = vi.fn();
    const client = createTestQueryClient();
    const { result } = renderHook(() => useToys({ saveErrorSink }), { wrapper: makeWrapper(client) });
    await act(async () => {
      await expect(result.current.saveToy({ toyId: null, payload: {} as never })).resolves.toBeUndefined();
    });
    expect(saveErrorSink).toHaveBeenCalledWith('boom');
  });

  it('updates a toy with partial changes and writes it back into the cached list', async () => {
    const patched = makeToy({ id: 3, customAttributes: { a: '1' } });
    vi.mocked(fetchToys).mockResolvedValue([makeToy({ id: 1 }), makeToy({ id: 3 })]);
    vi.mocked(patchToy).mockResolvedValue(patched);
    const client = createTestQueryClient();
    const { result } = renderToys(client);
    await settle(() => expect(result.current.toys).toHaveLength(2));
    await act(async () => {
      await result.current.updateToy({ toyId: 3, changes: { customAttributes: { a: '1' } } });
    });
    expect(vi.mocked(patchToy).mock.calls[0].slice(0, 2)).toEqual([3, { customAttributes: { a: '1' } }]);
    expect(client.getQueryData(['toys'])).toEqual([makeToy({ id: 1 }), patched]);
    await settle(() => expect(result.current.toys[1]).toEqual(patched));
  });

  it('removes a toy and refreshes the collection', async () => {
    vi.mocked(deleteToy).mockResolvedValue(undefined);
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderToys(client);
    await act(async () => {
      await result.current.removeToy(1);
    });
    expect(vi.mocked(deleteToy).mock.calls[0][0]).toBe(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['toys'] });
  });
});
