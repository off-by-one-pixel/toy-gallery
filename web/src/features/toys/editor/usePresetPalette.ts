'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { PaletteColor } from 'toy-editor';

import { PRESET_COLORS } from '@/features/toys/editor/constants';

export function usePresetPalette(): readonly PaletteColor[] {
  const t = useTranslations('colorPicker.names');
  return useMemo(() => PRESET_COLORS.map(({ key, value }) => ({ name: t(key), value })), [t]);
}
