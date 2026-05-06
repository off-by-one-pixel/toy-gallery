import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BOTTOM_PRESET,
  DEFAULT_TOP_PRESET,
  RIM_PRESETS,
  type RimPreset,
  nextRimPreset,
  sectionBottomPreset,
  sectionTopPreset,
  useToyStore,
} from "./toyMachine";

const initialState = useToyStore.getState();

beforeEach(() => {
  useToyStore.setState(initialState, true);
});

describe("rim preset accessors", () => {
  it("default top accessor returns 0 (down) for sections without a topPreset", () => {
    expect(DEFAULT_TOP_PRESET).toBe(0);
    expect(sectionTopPreset({ id: 0, diameter: 100, height: 50 })).toBe(0);
  });

  it("default bottom accessor returns 180 (up) for sections without a bottomPreset", () => {
    expect(DEFAULT_BOTTOM_PRESET).toBe(180);
    expect(sectionBottomPreset({ id: 0, diameter: 100, height: 50 })).toBe(180);
  });

  it("returns the explicit preset when set", () => {
    expect(sectionTopPreset({ id: 0, diameter: 100, height: 50, topPreset: 90 })).toBe(90);
    expect(sectionBottomPreset({ id: 0, diameter: 100, height: 50, bottomPreset: 45 })).toBe(45);
  });
});

describe("nextRimPreset", () => {
  it("cycles through the five presets in order and wraps", () => {
    const seen: number[] = [];
    let p: RimPreset = RIM_PRESETS[0];
    for (let i = 0; i < RIM_PRESETS.length + 1; i++) {
      seen.push(p);
      p = nextRimPreset(p);
    }
    expect(seen).toEqual([0, 45, 90, 135, 180, 0]);
  });
});

describe("setTopPreset / setBottomPreset", () => {
  it("updates only the targeted section", () => {
    useToyStore.setState({
      sections: [
        { id: 0, diameter: 100, height: 50 },
        { id: 1, diameter: 80, height: 30 },
      ],
    });
    useToyStore.getState().setTopPreset(1, 90);
    const after = useToyStore.getState().sections;
    expect(after[0].topPreset).toBeUndefined();
    expect(after[1].topPreset).toBe(90);
  });

  it("setBottomPreset updates only the targeted section's bottomPreset", () => {
    useToyStore.setState({
      sections: [
        { id: 0, diameter: 100, height: 50 },
        { id: 1, diameter: 80, height: 30 },
      ],
    });
    useToyStore.getState().setBottomPreset(0, 45);
    const after = useToyStore.getState().sections;
    expect(after[0].bottomPreset).toBe(45);
    expect(after[0].topPreset).toBeUndefined();
    expect(after[1].bottomPreset).toBeUndefined();
  });
});

describe("cycleTopPreset / cycleBottomPreset", () => {
  it("cycleTopPreset starts from the default and walks the cycle", () => {
    useToyStore.setState({ sections: [{ id: 7, diameter: 100, height: 50 }] });
    const cycle = useToyStore.getState().cycleTopPreset;
    cycle(7);
    expect(useToyStore.getState().sections[0].topPreset).toBe(45);
    cycle(7);
    expect(useToyStore.getState().sections[0].topPreset).toBe(90);
    cycle(7);
    cycle(7);
    expect(useToyStore.getState().sections[0].topPreset).toBe(180);
    cycle(7);
    expect(useToyStore.getState().sections[0].topPreset).toBe(0);
  });

  it("cycleBottomPreset starts from the default 180 and walks the cycle", () => {
    useToyStore.setState({ sections: [{ id: 9, diameter: 100, height: 50 }] });
    const cycle = useToyStore.getState().cycleBottomPreset;
    cycle(9);
    expect(useToyStore.getState().sections[0].bottomPreset).toBe(0);
    cycle(9);
    expect(useToyStore.getState().sections[0].bottomPreset).toBe(45);
  });

  it("ignores unknown ids", () => {
    useToyStore.setState({ sections: [{ id: 1, diameter: 100, height: 50 }] });
    useToyStore.getState().cycleTopPreset(999);
    expect(useToyStore.getState().sections[0].topPreset).toBeUndefined();
  });
});
