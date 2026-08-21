// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Toy } from '@/api/types';
import { useAttributesEditor } from './useAttributesEditor';

vi.mock('@/api', () => ({
  patchToy: vi.fn(),
}));

vi.mock('@heroui/react', () => ({
  Toast: { toast: { danger: vi.fn(), success: vi.fn() } },
}));

import { patchToy } from '@/api';

const mockPatchToy = vi.mocked(patchToy);

const makeToy = (overrides: Partial<Toy> = {}): Toy =>
  ({
    id: 1,
    brand: 'B',
    name: 'N',
    size: '',
    color: '#000',
    insertableLength: null,
    totalLength: null,
    circumference: null,
    shape: { sections: [] },
    customAttributes: {},
    ...overrides,
  }) as Toy;

/** Resolve all microtasks plus settle React's effect scheduler. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(() => {
  mockPatchToy.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAttributesEditor — initial state', () => {
  it('hydrates rows from toy.customAttributes', () => {
    const toy = makeToy({ customAttributes: { size: 'M', shade: 'blue' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0]).toMatchObject({ key: 'size', value: 'M', fromSaved: true });
    expect(result.current.rows[1]).toMatchObject({ key: 'shade', value: 'blue', fromSaved: true });
  });

  it('starts with zero rows when the toy has no attributes', () => {
    const { result } = renderHook(() => useAttributesEditor(makeToy()));
    expect(result.current.rows).toEqual([]);
  });

  it('gives each row a unique rowId for React keys', () => {
    const toy = makeToy({ customAttributes: { a: '1', b: '2', c: '3' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const ids = result.current.rows.map((r) => r.rowId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('useAttributesEditor — row mutations', () => {
  it('addRow appends a blank draft row', () => {
    const { result } = renderHook(() => useAttributesEditor(makeToy()));
    act(() => {
      result.current.addRow();
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0]).toMatchObject({ key: '', value: '', fromSaved: false });
  });

  it('updateKey mutates only the targeted row', () => {
    const toy = makeToy({ customAttributes: { size: 'M', shade: 'blue' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;
    act(() => {
      result.current.updateKey(target, 'gauge');
    });
    expect(result.current.rows[0].key).toBe('gauge');
    expect(result.current.rows[1].key).toBe('shade');
  });

  it('updateValue mutates only the targeted row', () => {
    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;
    act(() => {
      result.current.updateValue(target, 'L');
    });
    expect(result.current.rows[0].value).toBe('L');
  });
});

describe('useAttributesEditor — commit save', () => {
  it('does not call patchToy when there are no unsaved changes', async () => {
    const { result } = renderHook(() => useAttributesEditor(makeToy({ customAttributes: { size: 'M' } })));
    act(() => {
      result.current.commitChanges();
    });
    await flush();
    expect(mockPatchToy).not.toHaveBeenCalled();
  });

  it('calls patchToy with the projected dict on commit', async () => {
    mockPatchToy.mockResolvedValue(makeToy({ customAttributes: { size: 'L' } }));
    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    act(() => {
      result.current.updateValue(target, 'L');
    });
    await act(async () => {
      result.current.commitChanges();
      await flush();
    });

    expect(mockPatchToy).toHaveBeenCalledTimes(1);
    expect(mockPatchToy).toHaveBeenCalledWith(1, { customAttributes: { size: 'L' } });
  });

  it('applies the server response, replacing local rows with the canonical set', async () => {
    mockPatchToy.mockResolvedValue(makeToy({ customAttributes: { size: 'L', new: 'value' } }));
    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    act(() => {
      result.current.updateValue(target, 'L');
    });
    await act(async () => {
      result.current.commitChanges();
      await flush();
    });

    expect(result.current.rows.map((r) => [r.key, r.value])).toEqual([
      ['size', 'L'],
      ['new', 'value'],
    ]);
    expect(result.current.rows.every((r) => r.fromSaved)).toBe(true);
  });

  it('reverts to the last saved state when patchToy throws', async () => {
    mockPatchToy.mockRejectedValueOnce(new Error('boom'));
    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    act(() => {
      result.current.updateValue(target, 'L');
    });
    await act(async () => {
      result.current.commitChanges();
      await flush();
    });

    expect(result.current.rows.map((r) => [r.key, r.value])).toEqual([['size', 'M']]);
  });

  it('single-flights concurrent commits with one queued retry', async () => {
    // First save resolves slowly; a fresh draft row added during the
    // in-flight period queues exactly one retry that picks up the new key.
    let resolveFirst!: (toy: Toy) => void;
    mockPatchToy.mockImplementationOnce(
      () =>
        new Promise<Toy>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    mockPatchToy.mockResolvedValueOnce(makeToy({ customAttributes: { size: 'L', gauge: '14' } }));

    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    // First commit (becomes the in-flight save)
    act(() => {
      result.current.updateValue(target, 'L');
    });
    act(() => {
      result.current.commitChanges();
    });

    // Add a brand-new key while the first save is in flight. Each
    // commit while in-flight should coalesce to one queued retry.
    act(() => {
      result.current.addRow();
    });
    // Initial rows has length 1 ({ size: 'M' }); addRow appended at index 1.
    const newId = result.current.rows[1].rowId;
    act(() => {
      result.current.updateKey(newId, 'gauge');
    });
    act(() => {
      result.current.updateValue(newId, '14');
    });
    act(() => {
      result.current.commitChanges();
    });
    act(() => {
      result.current.commitChanges();
    });

    expect(mockPatchToy).toHaveBeenCalledTimes(1);

    // Resolve the first save; the queued retry should fire next with
    // the combined dict.
    await act(async () => {
      resolveFirst(makeToy({ customAttributes: { size: 'L' } }));
      await flush();
    });

    expect(mockPatchToy).toHaveBeenCalledTimes(2);
    expect(mockPatchToy).toHaveBeenLastCalledWith(1, { customAttributes: { size: 'L', gauge: '14' } });
  });
});

describe('useAttributesEditor — removeRow', () => {
  it('drops the targeted row and commits the resulting dict', async () => {
    mockPatchToy.mockResolvedValue(makeToy({ customAttributes: { shade: 'blue' } }));
    const toy = makeToy({ customAttributes: { size: 'M', shade: 'blue' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    await act(async () => {
      result.current.removeRow(target);
      await flush();
    });

    expect(mockPatchToy).toHaveBeenCalledWith(1, { customAttributes: { shade: 'blue' } });
    expect(result.current.rows.map((r) => r.key)).toEqual(['shade']);
  });
});

describe('useAttributesEditor — re-hydration on toy.id change', () => {
  it('replaces rows when the toy.id changes', () => {
    let toy = makeToy({ id: 1, customAttributes: { size: 'M' } });
    const { result, rerender } = renderHook(({ t }: { t: Toy }) => useAttributesEditor(t), {
      initialProps: { t: toy },
    });
    expect(result.current.rows[0].key).toBe('size');

    toy = makeToy({ id: 2, customAttributes: { shade: 'red' } });
    rerender({ t: toy });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].key).toBe('shade');
  });

  it('does not re-hydrate on same-id re-renders', () => {
    const toy = makeToy({ id: 1, customAttributes: { size: 'M' } });
    const { result, rerender } = renderHook(({ t }: { t: Toy }) => useAttributesEditor(t), {
      initialProps: { t: toy },
    });
    const target = result.current.rows[0].rowId;
    act(() => {
      result.current.updateValue(target, 'L'); // edit, don't commit
    });
    rerender({ t: { ...toy, customAttributes: { size: 'M' } } as Toy });
    expect(result.current.rows[0].value).toBe('L'); // edit survived
  });
});

describe('useAttributesEditor — unmount', () => {
  it('flushes pending edits on unmount', async () => {
    mockPatchToy.mockResolvedValue(makeToy({ customAttributes: { size: 'L' } }));
    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result, unmount } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;
    act(() => {
      result.current.updateValue(target, 'L');
    });

    unmount();
    await flush();

    expect(mockPatchToy).toHaveBeenCalledWith(1, { customAttributes: { size: 'L' } });
  });
});
