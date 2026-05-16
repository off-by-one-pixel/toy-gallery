// Centralized UI wording keyed by domain types / enums. All user-facing
// strings mapped from values (rather than passed in as component props) live
// here so a future i18n layer can swap them in one place.

import { Involvement, SectionShape } from './services/types';

export const SHAPE_LABEL: Record<SectionShape, string> = {
  [SectionShape.FLAT]: 'Flat',
  [SectionShape.EGG]: 'Egg',
  [SectionShape.CONE]: 'Cone',
  [SectionShape.SPIKE]: 'Spike',
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

export const TOY_ACTION_EDIT = 'Edit';
export const TOY_ACTION_COPY = 'Copy';
export const TOY_ACTION_DELETE = 'Delete';

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
export const SESSION_PEAK_CIRCUMFERENCE = 'max circ';
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

// ---- Toy shape template wizard ----

export const TEMPLATE_PICKER_TITLE = 'Choose a starting shape';
export const TEMPLATE_PICKER_SUBTITLE = "We'll scale your pick to the size you enter next.";
export const TEMPLATE_SIZE_TITLE = 'Set the dimensions';
export const TEMPLATE_SIZE_SUBTITLE = "We'll scale the shape you picked to these dimensions.";
export const templateStepAriaLabel = (current: number, total: number): string => `Step ${current} of ${total}`;

export const TEMPLATE_BLANK_NAME = 'Start blank';
export const TEMPLATE_BLANK_DESCRIPTION = 'Skip the wizard and start from the default toy.';

export const TEMPLATE_PICKED_SHAPE_PREFIX = 'Shape';

export const TEMPLATE_FIELD_TOTAL_LENGTH = 'Total length';
export const TEMPLATE_FIELD_INSERTABLE_LENGTH = 'Insertable length';
export const TEMPLATE_FIELD_MAX_DIAMETER = 'Max diameter';
export const TEMPLATE_FIELD_CIRCUMFERENCE = 'Circumference';

export const TEMPLATE_BACK = 'Back';
export const TEMPLATE_CONTINUE = 'Continue';

// ---- Toy edit modal: template-related strings ----

export const TEMPLATE_NEW_TOY_HEADER_TITLE = 'Pick a starting shape';
export const TEMPLATE_MORE_ACTIONS_LABEL = 'More actions';
export const TEMPLATE_EXPORT_MENU_LABEL = 'Export JSON';
export const TEMPLATE_EXPORT_MENU_DESCRIPTION = 'Copy a template entry for toyTemplates.json';
export const TEMPLATE_IMPORT_MENU_LABEL = 'Import JSON';
export const TEMPLATE_IMPORT_MENU_DESCRIPTION = 'Paste a template entry to replace the current toy';

// ---- Template JSON dialog ----

export const TEMPLATE_EXPORT_DIALOG_TITLE = 'Export toy as template JSON';
export const TEMPLATE_EXPORT_DIALOG_DESCRIPTION =
  'Copy this JSON into src/data/toyTemplates.json. Fill in id, name, and description before committing.';
export const TEMPLATE_IMPORT_DIALOG_TITLE = 'Import template JSON';
export const TEMPLATE_IMPORT_DIALOG_DESCRIPTION =
  'Paste a ToyTemplate entry and load it into the editor. The current toy is replaced.';
export const TEMPLATE_IMPORT_PLACEHOLDER = '{ "id": "...", "shape": { ... } }';
export const TEMPLATE_CLIPBOARD_ERROR = 'Could not access clipboard — select the text and copy manually.';
export const TEMPLATE_DIALOG_CLOSE = 'Close';
export const TEMPLATE_DIALOG_CANCEL = 'Cancel';
export const TEMPLATE_DIALOG_COPY = 'Copy';
export const TEMPLATE_DIALOG_COPIED = 'Copied';
export const TEMPLATE_DIALOG_LOAD = 'Load';
