import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURVE_ANGLES,
  type CurveAngle,
  nextCurveAngle,
  sectionBottomCurveAngle,
  sectionTopCurveAngle,
  type ToySection,
  useEditorSnapshot,
  useToyStore,
} from './toyMachine';

const initialState = useToyStore.getState();

const seed = (...sections: Array<Partial<ToySection> & { id: number }>) =>
  useToyStore.setState({
    sections: sections.map((section) => ({ diameter: 100, height: 50, ...section })),
  });

const sections = () => useToyStore.getState().sections;

beforeEach(() => {
  useToyStore.setState(initialState, true);
});

describe('rim angle accessors', () => {
  it.each<[string, (section: ToySection) => CurveAngle, Partial<ToySection>, CurveAngle]>([
    ['top defaults to 0 (down)', sectionTopCurveAngle, {}, 0],
    ['bottom defaults to 180 (up)', sectionBottomCurveAngle, {}, 180],
    ['top returns the explicit angle', sectionTopCurveAngle, { topCurveAngle: 90 }, 90],
    ['bottom returns the explicit angle', sectionBottomCurveAngle, { bottomCurveAngle: 45 }, 45],
  ])('%s', (_, accessor, angles, expected) => {
    expect(accessor({ id: 0, diameter: 100, height: 50, ...angles })).toBe(expected);
  });
});

describe('nextCurveAngle', () => {
  it('cycles through the five angles in order and wraps', () => {
    const seen: number[] = [];
    let p: CurveAngle = CURVE_ANGLES[0];
    for (let i = 0; i < CURVE_ANGLES.length + 1; i++) {
      seen.push(p);
      p = nextCurveAngle(p);
    }
    expect(seen).toEqual([0, 45, 90, 135, 180, 0]);
  });
});

describe('curve angle cycling', () => {
  const EDGES = [
    {
      edge: 'top',
      cycle: 'cycleTopCurveAngle',
      angle: 'topCurveAngle',
      other: 'bottomCurveAngle',
      walk: [45, 90, 135, 180, 0],
    },
    {
      edge: 'bottom',
      cycle: 'cycleBottomCurveAngle',
      angle: 'bottomCurveAngle',
      other: 'topCurveAngle',
      walk: [0, 45, 90, 135, 180],
    },
  ] as const;

  it.each(EDGES)('$edge starts from the default and walks the cycle', ({ cycle, angle, walk }) => {
    seed({ id: 7 });
    for (const expected of walk) {
      useToyStore.getState()[cycle](7);
      expect(sections()[0][angle]).toBe(expected);
    }
  });

  it.each(EDGES)('$edge updates only the targeted section and edge', ({ cycle, angle, other, walk }) => {
    seed({ id: 0 }, { id: 1 });
    useToyStore.getState()[cycle](1);
    expect(sections()[0][angle]).toBeUndefined();
    expect(sections()[1][angle]).toBe(walk[0]);
    expect(sections()[1][other]).toBeUndefined();
  });

  it.each(EDGES)('$edge ignores unknown ids', ({ cycle, angle }) => {
    seed({ id: 1 });
    useToyStore.getState()[cycle](999);
    expect(sections()[0][angle]).toBeUndefined();
  });
});

describe('setSectionColor', () => {
  it('sets a color on the targeted section only', () => {
    seed({ id: 1 }, { id: 2 });
    useToyStore.getState().setSectionColor(2, '#ff0000');
    expect(sections()[0].color).toBeUndefined();
    expect(sections()[1].color).toBe('#ff0000');
  });

  it('clears back to the toy color with null', () => {
    seed({ id: 1, color: '#ff0000' });
    useToyStore.getState().setSectionColor(1, null);
    expect(sections()[0].color).toBeNull();
  });

  it('survives hydrate', () => {
    useToyStore.getState().hydrate({
      sections: [{ id: 1, diameter: 100, height: 50, color: '#00ff00' }],
      topShape: 'EGG',
      bottomShape: 'FLAT',
    });
    expect(sections()[0].color).toBe('#00ff00');
  });
});

describe('section sizing', () => {
  const UNTOUCHED = { diameter: false, height: false };

  it('setDiameter changes the targeted section and marks only its diameter as touched', () => {
    seed({ id: 1, touched: UNTOUCHED }, { id: 2 });
    useToyStore.getState().setDiameter(1, 80);
    expect(sections()[0]).toMatchObject({ diameter: 80, height: 50, touched: { diameter: true, height: false } });
    expect(sections()[1]).toEqual({ id: 2, diameter: 100, height: 50 });
  });

  it('setHeight changes the targeted section and marks only its height as touched', () => {
    seed({ id: 1, touched: UNTOUCHED }, { id: 2 });
    useToyStore.getState().setHeight(1, 20);
    expect(sections()[0]).toMatchObject({ diameter: 100, height: 20, touched: { diameter: false, height: true } });
    expect(sections()[1]).toEqual({ id: 2, diameter: 100, height: 50 });
  });

  it('treats a section without touched flags as fully touched', () => {
    seed({ id: 1 });
    useToyStore.getState().setHeight(1, 20);
    expect(sections()[0].touched).toEqual({ diameter: true, height: true });
  });

  it('setCircumference sets and clears the circumference without touching the section', () => {
    seed({ id: 1, touched: UNTOUCHED });
    useToyStore.getState().setCircumference(1, 120);
    expect(sections()[0]).toMatchObject({ circumference: 120, touched: UNTOUCHED });
    useToyStore.getState().setCircumference(1, null);
    expect(sections()[0].circumference).toBeNull();
  });
});

describe('adding and removing sections', () => {
  it('appends untouched default sections with increasing ids', () => {
    useToyStore.getState().newSection();
    useToyStore.getState().newSection();
    expect(sections().map((s) => s.id)).toEqual([0, 1, 2]);
    expect(sections()[2]).toEqual({ id: 2, diameter: 100, height: 50, touched: { diameter: false, height: false } });
  });

  it('removes only the targeted section', () => {
    seed({ id: 1 }, { id: 2 }, { id: 3 });
    useToyStore.getState().removeSection(2);
    expect(sections().map((s) => s.id)).toEqual([1, 3]);
  });
});

describe('hydrate', () => {
  it('continues ids after the highest hydrated id', () => {
    useToyStore.getState().hydrate({
      sections: [
        { id: 9, diameter: 30, height: 40 },
        { id: 4, diameter: 30, height: 40 },
      ],
      topShape: 'FLAT',
      bottomShape: 'FLAT',
    });
    useToyStore.getState().newSection();
    expect(sections().map((s) => s.id)).toEqual([9, 4, 10]);
  });

  it('marks sections as touched unless they carry their own flags', () => {
    useToyStore.getState().hydrate({
      sections: [
        { id: 1, diameter: 30, height: 40 },
        { id: 2, diameter: 30, height: 40, touched: { diameter: false, height: true } },
      ],
      topShape: 'FLAT',
      bottomShape: 'FLAT',
    });
    expect(sections().map((s) => s.touched)).toEqual([
      { diameter: true, height: true },
      { diameter: false, height: true },
    ]);
  });

  it('loads shapes and guides, re-enables snapping and shows circumferences only when a section has one', () => {
    useToyStore.getState().setSnapEnabled(false);
    useToyStore.getState().hydrate({
      sections: [{ id: 1, diameter: 30, height: 40, circumference: 95 }],
      topShape: 'EGG',
      bottomShape: 'CONE',
      insertableLengthMm: 80,
    });
    expect(useToyStore.getState()).toMatchObject({
      topShape: 'EGG',
      bottomShape: 'CONE',
      insertableLengthMm: 80,
      knownTotalMm: null,
      knownSizeMm: null,
      snapEnabled: true,
      showSectionCircumference: true,
    });

    useToyStore
      .getState()
      .hydrate({ sections: [{ id: 1, diameter: 30, height: 40 }], topShape: 'FLAT', bottomShape: 'FLAT' });
    expect(useToyStore.getState().showSectionCircumference).toBe(false);
  });
});

describe('plain setters', () => {
  it('store shapes, guides and toggles as given', () => {
    const store = useToyStore.getState();
    store.setTopShape('SPIKE');
    store.setBottomShape('EGG');
    store.setInsertableLength(80);
    store.setKnownTotal(150);
    store.setKnownSize(40);
    store.setSnapEnabled(false);
    store.setShowSectionCircumference(true);
    expect(useToyStore.getState()).toMatchObject({
      topShape: 'SPIKE',
      bottomShape: 'EGG',
      insertableLengthMm: 80,
      knownTotalMm: 150,
      knownSizeMm: 40,
      snapEnabled: false,
      showSectionCircumference: true,
    });
  });
});

describe('useEditorSnapshot', () => {
  it('returns the toy fields and keeps its identity until one of them changes', () => {
    seed({ id: 1 });
    const { result } = renderHook(() => useEditorSnapshot());
    const first = result.current;
    expect(first).toEqual({
      sections: sections(),
      topShape: useToyStore.getState().topShape,
      bottomShape: useToyStore.getState().bottomShape,
      insertableLengthMm: null,
      knownTotalMm: null,
      knownSizeMm: null,
    });

    act(() => useToyStore.getState().setSnapEnabled(false));
    expect(result.current).toBe(first);

    act(() => useToyStore.getState().setHeight(1, 20));
    expect(result.current).not.toBe(first);
    expect(result.current.sections[0].height).toBe(20);
  });
});
