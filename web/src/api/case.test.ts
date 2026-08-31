import { describe, expect, it } from 'vitest';

import { camelToSnake, snakeToCamel } from '@/api/case';

describe('case conversion', () => {
  it('renames nested keys in both directions', () => {
    expect(camelToSnake({ insertableLength: 1, shape: { topSectionShape: 'EGG' } })).toEqual({
      insertable_length: 1,
      shape: { top_section_shape: 'EGG' },
    });
    expect(snakeToCamel({ insertable_length: 1, shape: { top_section_shape: 'EGG' } })).toEqual({
      insertableLength: 1,
      shape: { topSectionShape: 'EGG' },
    });
  });

  it('renames the customAttributes envelope but never the user keys inside it', () => {
    const out = camelToSnake<{ custom_attributes: Record<string, string> }>({
      customAttributes: { Geg: 'x', 'My Key': 'y', material_type: 'z' },
    });
    expect(out).toEqual({ custom_attributes: { Geg: 'x', 'My Key': 'y', material_type: 'z' } });
  });

  it('leaves stored attribute keys untouched when reading', () => {
    const out = snakeToCamel<{ customAttributes: Record<string, string> }>({
      custom_attributes: { Geg: 'x', material_type: 'z' },
    });
    expect(out).toEqual({ customAttributes: { Geg: 'x', material_type: 'z' } });
  });
});
