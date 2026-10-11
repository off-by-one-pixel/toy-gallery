import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURVE_ANGLES,
  type CurveAngle,
  nextCurveAngle,
  sectionBottomCurveAngle,
  sectionTopCurveAngle,
  type ToySection,
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
