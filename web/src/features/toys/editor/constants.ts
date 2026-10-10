import type { Toy as EditorToy } from 'toy-editor';

import { SectionShape } from '@/api/types';

export const DEFAULT_FILL = '#c4b5fd';

export const PRESET_COLORS = [
  { key: 'purple', value: '#c4b5fd' },
  { key: 'slate', value: '#475569' },
  { key: 'blue', value: '#bae6fd' },
  { key: 'red', value: '#fca5a5' },
  { key: 'green', value: '#bbf7d0' },
] as const;

export const NEW_TOY_MM: EditorToy = {
  sections: [
    { id: 0, diameter: 90, height: 25, circumference: null },
    { id: 1, diameter: 55, height: 75, circumference: null },
    { id: 2, diameter: 65, height: 50, circumference: null },
  ],
  topShape: SectionShape.EGG,
  bottomShape: SectionShape.FLAT,
};
