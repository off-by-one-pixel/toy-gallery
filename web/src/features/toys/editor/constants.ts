import type { PaletteColor, Toy as EditorToy } from 'toy-editor';

import { SectionShape } from '@/api/types';

/** Default fill applied to a fresh toy when the user hasn't picked
 *  a color yet. */
export const DEFAULT_FILL = '#c4b5fd';

/** Preset color chips shown in the modal's color picker. */
export const PRESET_COLORS: readonly { name: string; hex: string }[] = [
  { name: 'Purple', hex: '#c4b5fd' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Blue', hex: '#bae6fd' },
  { name: 'Red', hex: '#fca5a5' },
  { name: 'Green', hex: '#bbf7d0' },
];

export const SECTION_PALETTE: readonly PaletteColor[] = PRESET_COLORS.map(({ name, hex }) => ({
  name,
  value: hex,
}));

/** Legacy three-section default toy seeded into the editor when the
 *  user picks "Start blank" in the template wizard. Kept here so the
 *  shape only changes on purpose. */
export const NEW_TOY_MM: EditorToy = {
  sections: [
    { id: 0, diameter: 90, height: 25, circumference: null },
    { id: 1, diameter: 55, height: 75, circumference: null },
    { id: 2, diameter: 65, height: 50, circumference: null },
  ],
  topShape: SectionShape.EGG,
  bottomShape: SectionShape.FLAT,
};
