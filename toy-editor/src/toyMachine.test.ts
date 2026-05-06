import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BOTTOM_CURVE_ANGLE,
  DEFAULT_TOP_CURVE_ANGLE,
  CURVE_ANGLES,
  type CurveAngle,
  nextCurveAngle,
  sectionBottomCurveAngle,
  sectionTopCurveAngle,
  useToyStore,
} from "./toyMachine";

const initialState = useToyStore.getState();

beforeEach(() => {
  useToyStore.setState(initialState, true);
});

describe("rim angle accessors", () => {
  it("default top accessor returns 0 (down) for sections without a topCurveAngle", () => {
    expect(DEFAULT_TOP_CURVE_ANGLE).toBe(0);
    expect(sectionTopCurveAngle({ id: 0, diameter: 100, height: 50 })).toBe(0);
  });

  it("default bottom accessor returns 180 (up) for sections without a bottomCurveAngle", () => {
    expect(DEFAULT_BOTTOM_CURVE_ANGLE).toBe(180);
    expect(sectionBottomCurveAngle({ id: 0, diameter: 100, height: 50 })).toBe(180);
  });

  it("returns the explicit angle when set", () => {
    expect(sectionTopCurveAngle({ id: 0, diameter: 100, height: 50, topCurveAngle: 90 })).toBe(90);
    expect(sectionBottomCurveAngle({ id: 0, diameter: 100, height: 50, bottomCurveAngle: 45 })).toBe(45);
  });
});

describe("nextCurveAngle", () => {
  it("cycles through the five angles in order and wraps", () => {
    const seen: number[] = [];
    let p: CurveAngle = CURVE_ANGLES[0];
    for (let i = 0; i < CURVE_ANGLES.length + 1; i++) {
      seen.push(p);
      p = nextCurveAngle(p);
    }
    expect(seen).toEqual([0, 45, 90, 135, 180, 0]);
  });
});

describe("setTopCurveAngle / setBottomCurveAngle", () => {
  it("updates only the targeted section", () => {
    useToyStore.setState({
      sections: [
        { id: 0, diameter: 100, height: 50 },
        { id: 1, diameter: 80, height: 30 },
      ],
    });
    useToyStore.getState().setTopCurveAngle(1, 90);
    const after = useToyStore.getState().sections;
    expect(after[0].topCurveAngle).toBeUndefined();
    expect(after[1].topCurveAngle).toBe(90);
  });

  it("setBottomCurveAngle updates only the targeted section's bottomCurveAngle", () => {
    useToyStore.setState({
      sections: [
        { id: 0, diameter: 100, height: 50 },
        { id: 1, diameter: 80, height: 30 },
      ],
    });
    useToyStore.getState().setBottomCurveAngle(0, 45);
    const after = useToyStore.getState().sections;
    expect(after[0].bottomCurveAngle).toBe(45);
    expect(after[0].topCurveAngle).toBeUndefined();
    expect(after[1].bottomCurveAngle).toBeUndefined();
  });
});

describe("cycleTopCurveAngle / cycleBottomCurveAngle", () => {
  it("cycleTopCurveAngle starts from the default and walks the cycle", () => {
    useToyStore.setState({ sections: [{ id: 7, diameter: 100, height: 50 }] });
    const cycle = useToyStore.getState().cycleTopCurveAngle;
    cycle(7);
    expect(useToyStore.getState().sections[0].topCurveAngle).toBe(45);
    cycle(7);
    expect(useToyStore.getState().sections[0].topCurveAngle).toBe(90);
    cycle(7);
    cycle(7);
    expect(useToyStore.getState().sections[0].topCurveAngle).toBe(180);
    cycle(7);
    expect(useToyStore.getState().sections[0].topCurveAngle).toBe(0);
  });

  it("cycleBottomCurveAngle starts from the default 180 and walks the cycle", () => {
    useToyStore.setState({ sections: [{ id: 9, diameter: 100, height: 50 }] });
    const cycle = useToyStore.getState().cycleBottomCurveAngle;
    cycle(9);
    expect(useToyStore.getState().sections[0].bottomCurveAngle).toBe(0);
    cycle(9);
    expect(useToyStore.getState().sections[0].bottomCurveAngle).toBe(45);
  });

  it("ignores unknown ids", () => {
    useToyStore.setState({ sections: [{ id: 1, diameter: 100, height: 50 }] });
    useToyStore.getState().cycleTopCurveAngle(999);
    expect(useToyStore.getState().sections[0].topCurveAngle).toBeUndefined();
  });
});
