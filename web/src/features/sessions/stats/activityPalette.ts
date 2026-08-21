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
  timeOfDayHue: number;
  sessionsHue: number;
  weekdayHue: number;
  sessionsGamma: number;
  /** HSL saturation percentage applied to insertion days. */
  saturation: number;
  /** Lightness percentage at zero intensity (palest). */
  lightnessMax: number;
  /** Lightness percentage at full intensity (deepest). */
  lightnessMin: number;
  /**
   * Exponent applied to the normalized 0..1 intensity before mapping to
   * lightness. > 1 compresses the low end and stretches the high end so
   * small steps near a personal max are more visible than equal-size
   * steps near the bottom of the range.
   */
  gamma: number;
}

export const ACTIVITY_PALETTE: ActivityPalette = {
  empty: '#ebedf0',
  usedOnly: '#d1d5db',
  lengthHue: 330,
  circumferenceHue: 220,
  timeOfDayHue: 40,
  sessionsHue: 150,
  weekdayHue: 270,
  sessionsGamma: 1.4,
  saturation: 65,
  lightnessMax: 90,
  lightnessMin: 40,
  gamma: 3,
};
