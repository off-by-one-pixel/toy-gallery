'use client';

import { useTranslations } from 'next-intl';

import { useGirth } from '@/providers/GirthProvider';
import { GIRTHS, type Girth } from '@/services/girth';
import Switcher, { type SwitcherItem } from './Switcher';

export default function GirthToggle() {
  const { girth, setGirth } = useGirth();
  const t = useTranslations('girthToggle');
  const items: SwitcherItem<Girth>[] = GIRTHS.map((g) => ({
    key: g,
    label: t(g),
  }));
  return <Switcher items={items} value={girth} onChange={setGirth} ariaLabel={t('ariaLabel')} />;
}
