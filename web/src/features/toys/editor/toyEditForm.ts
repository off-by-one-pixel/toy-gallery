import { editorToPayload, type EditorState } from '@/features/toys/converters/editor';
import type { Toy, ToyPayload } from '@/api/types';

export type ToyIdentity = Readonly<{
  brand: string;
  name: string;
  size: string;
  color: string;
}>;

export type ToyEditMode = { kind: 'new' } | { kind: 'edit'; toy: Toy } | { kind: 'copy'; toy: Toy };

type ValidationError = 'identityRequired' | 'sectionsRequired';

export type ValidationResult =
  Readonly<{ ok: true; payload: ToyPayload }> | Readonly<{ ok: false; error: ValidationError }>;

export function initialIdentity(source: Toy | null, defaultColor: string): ToyIdentity {
  return {
    brand: source?.brand ?? '',
    name: source?.name ?? '',
    size: source?.size ?? '',
    color: source?.color || defaultColor,
  };
}

export function isIdentityEqual(a: ToyIdentity, b: ToyIdentity): boolean {
  return a.brand === b.brand && a.name === b.name && a.size === b.size && a.color === b.color;
}

export function validateAndBuildPayload(
  identity: ToyIdentity,
  editor: EditorState,
  mode: ToyEditMode,
): ValidationResult {
  if (!identity.brand.trim() || !identity.name.trim()) {
    return { ok: false, error: 'identityRequired' };
  }
  if (editor.sections.length === 0) {
    return { ok: false, error: 'sectionsRequired' };
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
