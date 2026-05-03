// Centralized UI wording keyed by domain types / enums. All user-facing
// strings mapped from values (rather than passed in as component props) live
// here so a future i18n layer can swap them in one place.

import { Involvement, SectionShape } from './services/types';
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

export const TOY_ITEM_SINGULAR = 'item';
export const TOY_ITEM_PLURAL = 'items';

export const TOY_CIRCUMFERENCE = 'circumference';
export const TOY_CIRCUMFERENCE_SHORT = 'circ.';

// ---- Sessions ----

export const INVOLVEMENT_LABEL: Record<Involvement, string> = {
  [Involvement.USED]: 'Used',
  [Involvement.INSERTED]: 'Inserted',
  [Involvement.FULLY_INSERTED]: 'Fully',
};

export const SESSIONS_TITLE = 'Sessions';
export const SESSIONS_NEW_BUTTON = 'New session';
export const SESSIONS_RECORDED = 'recorded';

export const SESSION_FILTER_ALL = 'All';
export const SESSION_FILTER_WEEK = 'This week';
export const SESSION_FILTER_MONTH = 'This month';

export const SESSION_PEAK_LENGTH = 'max len';
export const SESSION_PEAK_DIAMETER = 'max dia';
export const SESSION_TOY_DELETED = 'deleted';
export const SESSION_EMPTY = 'No sessions yet — record your first one.';
export const SESSION_EMPTY_FILTERED_PREFIX = 'No sessions in';

export const SESSION_NEW_TITLE = 'New session';
export const SESSION_EDIT_TITLE = 'Edit session';
export const SESSION_BACK_TO_LIST = 'Back to sessions';
export const SESSION_WHEN_HEADING = 'When';
export const SESSION_NOW_BUTTON = 'Now';
export const SESSION_TOYS_HEADING = 'Toys used';
export const SESSION_TOYS_HINT = 'Tap a tag below each toy to record how it was used.';
export const SESSION_CANCEL = 'Cancel';
export const SESSION_SAVE = 'Save session';
export const SESSION_SAVED_TOAST = 'Session saved';
export const SESSION_EDIT_ARROW_LABEL = 'Edit session';
