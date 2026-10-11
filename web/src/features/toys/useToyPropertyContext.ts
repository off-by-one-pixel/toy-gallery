'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useGirth } from '@/features/preferences/useGirth';
import { useUnit } from '@/features/preferences/useUnit';
import type { ToyPropertyContext } from '@/features/toys/properties';

export function useToyPropertyContext(): ToyPropertyContext {
  const t = useTranslations();
  const { girth } = useGirth();
  const { unit } = useUnit();
  const locale = useLocale();
  return { t, girth, unit, locale };
}
