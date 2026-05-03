// All colour values for the sessions activity tracker live here so the
// component renders pure logic. Tune the palette without touching the
// component.

export interface ActivityPalette {
  /** Colour for days with no sessions. */
  empty: string;
  /** Colour for days with sessions but no insertion peaks ("used" only). */
  usedOnly: string;
  /** HSL hue for length-dominant days. */
  lengthHue: number;
  /** HSL hue for circumference-dominant days. */
  circumferenceHue: number;
  /** HSL saturation percentage applied to insertion days. */
  saturation: number;
  /** Lightness percentage at zero intensity (palest). */
  lightnessMax: number;
  /** Lightness percentage at full intensity (deepest). */
  lightnessMin: number;
}

export const ACTIVITY_PALETTE: ActivityPalette = {
  empty: '#ebedf0',
  usedOnly: '#d1d5db',
  lengthHue: 330,
  circumferenceHue: 220,
  saturation: 65,
  lightnessMax: 90,
  lightnessMin: 40,
};
