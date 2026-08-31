export interface ActivityPalette {
  empty: string;
  usedOnly: string;
  lengthHue: number;
  circumferenceHue: number;
  timeOfDayHue: number;
  sessionsHue: number;
  durationHue: number;
  weekdayHue: number;
  sessionsGamma: number;
  durationGamma: number;
  saturation: number;
  lightnessMax: number;
  lightnessMin: number;
  gamma: number;
}

export const ACTIVITY_PALETTE: ActivityPalette = {
  empty: '#ebedf0',
  usedOnly: '#d1d5db',
  lengthHue: 330,
  circumferenceHue: 220,
  timeOfDayHue: 40,
  sessionsHue: 150,
  durationHue: 185,
  weekdayHue: 270,
  sessionsGamma: 1.4,
  durationGamma: 0.9,
  saturation: 65,
  lightnessMax: 90,
  lightnessMin: 40,
  gamma: 3,
};
