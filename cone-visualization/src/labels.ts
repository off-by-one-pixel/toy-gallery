// Centralized UI wording keyed by domain types / enums. All user-facing
// strings mapped from values (rather than passed in as component props) live
// here so a future i18n layer can swap them in one place.

import { SectionShape } from './services/types';
import type { SortColumn } from './services/sort';

export const SHAPE_LABEL: Record<SectionShape, string> = {
  [SectionShape.FLAT]: 'Flat',
  [SectionShape.EGG]: 'Egg',
  [SectionShape.CONE]: 'Cone',
  [SectionShape.SPIKE]: 'Spike',
};

export const SORT_COLUMN_LABEL: Record<SortColumn, string> = {
  name: 'Brand / Model',
  insertable: 'Insertable',
  circumference: 'Circumference',
  length: 'Length',
  diameter: 'Diameter',
};

export const ATTRIBUTES_HEADING = 'Attributes';
export const ADD_ATTRIBUTE_BUTTON = '+ Add field';
export const ATTRIBUTE_KEY_PLACEHOLDER = 'Name';
export const ATTRIBUTE_VALUE_PLACEHOLDER = 'Value';
export const ATTRIBUTE_REMOVE_LABEL = 'Remove attribute';
export const ATTRIBUTE_SAVE_ERROR = 'Could not save attributes';
