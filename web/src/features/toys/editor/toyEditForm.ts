import { editorToPayload, type EditorState } from '@/features/toys/converters/editor';
import type { Toy, ToyPayload } from '@/api/types';

/** The four identification fields the user types into the edit modal. */
export type ToyIdentity = Readonly<{
  brand: string;
  name: string;
  size: string;
  color: string;
}>;

export type ToyEditMode = { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

export type ValidationResult = Readonly<{ ok: true; payload: ToyPayload }> | Readonly<{ ok: false; error: string }>;

// -------- Identity reducer (typed field setter) --------

export type IdentityAction = Readonly<{ field: keyof ToyIdentity; value: string }>;

export function identityReducer(state: ToyIdentity, action: IdentityAction): ToyIdentity {
  return { ...state, [action.field]: action.value };
}

/** Seed identity from an existing toy (edit / copy) or empty fields
 *  (new). Pure — used by the facade hook for its initial state. */
export function initialIdentity(source: Toy | null, defaultColor: string): ToyIdentity {
  return {
    brand: source?.brand ?? '',
    name: source?.name ?? '',
    size: source?.size ?? '',
    color: source?.color || defaultColor,
  };
}

// -------- Validation + payload assembly --------

/** Validate that the user can save and, if so, assemble the API
 *  payload. Trims string fields and folds copy-mode extras
 *  (datePurchased, retired, customAttributes) through unchanged. */
export function validateAndBuildPayload(
  identity: ToyIdentity,
  editor: EditorState,
  mode: ToyEditMode,
): ValidationResult {
  if (!identity.brand.trim() || !identity.name.trim()) {
    return { ok: false, error: 'Brand and name are required.' };
  }
  if (editor.sections.length === 0) {
    return { ok: false, error: 'At least one section is required.' };
  }
  const payload = editorToPayload({
    state: editor,
    identity: {
      brand: identity.brand.trim(),
      name: identity.name.trim(),
      size: identity.size.trim(),
      color: identity.color,
    },
    extras:
      mode.kind === 'copy'
        ? {
            datePurchased: mode.toy.datePurchased ?? null,
            retired: mode.toy.retired,
            customAttributes: mode.toy.customAttributes,
          }
        : undefined,
  });
  return { ok: true, payload };
}
