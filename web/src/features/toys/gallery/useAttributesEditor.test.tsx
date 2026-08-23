// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Toy } from '@/api/types';
import { api, capture, http, HttpResponse, server, wire, type Captured } from '@/test/msw';
import { useAttributesEditor } from '@/features/toys/gallery/useAttributesEditor';

vi.mock('@heroui/react', () => ({
  Toast: { toast: { danger: vi.fn(), success: vi.fn() } },
}));

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

const patchReturning = (toy: Toy): Captured => capture('patch', api('/toys/toys/1/'), () => wire(toy));

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => setTimeout(r, 0));
};

beforeEach(() => {
  vi.clearAllMocks();
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
    const patch = patchReturning(makeToy());
    const { result } = renderHook(() => useAttributesEditor(makeToy({ customAttributes: { size: 'M' } })));
    act(() => {
      result.current.commitChanges();
    });
    await flush();
    expect(patch.urls).toHaveLength(0);
  });

  it('calls patchToy with the projected dict on commit', async () => {
    const patch = patchReturning(makeToy({ customAttributes: { size: 'L' } }));
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

    expect(patch.urls).toHaveLength(1);
    expect(patch.bodies[0]).toEqual({ custom_attributes: { size: 'L' } });
  });

  it('applies the server response, replacing local rows with the canonical set', async () => {
    patchReturning(makeToy({ customAttributes: { size: 'L', new: 'value' } }));
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
    capture('patch', api('/toys/toys/1/'), () => HttpResponse.json({ detail: 'boom' }, { status: 500 }));
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
    let resolveFirst!: (t: Toy) => void;
    const bodies: unknown[] = [];
    server.use(
      http.patch(api('/toys/toys/1/'), async ({ request }) => {
        bodies.push(await request.json());
        if (bodies.length === 1) {
          const first = await new Promise<Toy>((resolve) => {
            resolveFirst = resolve;
          });
          return HttpResponse.json(wire(first) as never);
        }
        return HttpResponse.json(wire(makeToy({ customAttributes: { size: 'L', gauge: '14' } })) as never);
      }),
    );

    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    act(() => {
      result.current.updateValue(target, 'L');
    });
    act(() => {
      result.current.commitChanges();
    });

    act(() => {
      result.current.addRow();
    });
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

    await act(async () => {
      await flush();
    });
    expect(bodies).toHaveLength(1);

    await act(async () => {
      resolveFirst(makeToy({ customAttributes: { size: 'L' } }));
      await flush();
    });

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]).toEqual({ custom_attributes: { size: 'L', gauge: '14' } });
  });
});

describe('useAttributesEditor — removeRow', () => {
  it('drops the targeted row and commits the resulting dict', async () => {
    const patch = patchReturning(makeToy({ customAttributes: { shade: 'blue' } }));
    const toy = makeToy({ customAttributes: { size: 'M', shade: 'blue' } });
    const { result } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;

    await act(async () => {
      result.current.removeRow(target);
      await flush();
    });

    expect(patch.bodies[0]).toEqual({ custom_attributes: { shade: 'blue' } });
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
      result.current.updateValue(target, 'L');
    });
    rerender({ t: { ...toy, customAttributes: { size: 'M' } } as Toy });
    expect(result.current.rows[0].value).toBe('L');
  });
});

describe('useAttributesEditor — unmount', () => {
  it('flushes pending edits on unmount', async () => {
    const patch = patchReturning(makeToy({ customAttributes: { size: 'L' } }));
    const toy = makeToy({ customAttributes: { size: 'M' } });
    const { result, unmount } = renderHook(() => useAttributesEditor(toy));
    const target = result.current.rows[0].rowId;
    act(() => {
      result.current.updateValue(target, 'L');
    });

    unmount();
    await flush();

    expect(patch.bodies[0]).toEqual({ custom_attributes: { size: 'L' } });
  });
});
