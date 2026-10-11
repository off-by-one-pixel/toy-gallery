'use client';

import { Copy, CopyPlus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Toy } from '@/api/types';
import { ActionButtons, type ActionDef } from '@/components/ActionButtons';

export type ToyActions = Readonly<{
  onEdit: (toy: Toy) => void;
  onCopy: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
  onGhost?: (toy: Toy) => void;
}>;

export function toyActionDefs(
  t: (key: 'edit' | 'copy' | 'delete' | 'compare') => string,
  toy: Toy,
  { onEdit, onCopy, onDelete, onGhost }: ToyActions,
): ActionDef[] {
  return [
    { key: 'edit', label: t('edit'), icon: Pencil, variant: 'outline', onPress: () => onEdit(toy) },
    { key: 'copy', label: t('copy'), icon: Copy, variant: 'outline', onPress: () => onCopy(toy) },
    ...(onGhost
      ? [
          {
            key: 'ghost',
            label: t('compare'),
            icon: CopyPlus,
            variant: 'outline',
            onPress: () => onGhost(toy),
          } satisfies ActionDef,
        ]
      : []),
    { key: 'delete', label: t('delete'), icon: Trash2, variant: 'danger-soft', onPress: () => onDelete(toy) },
  ];
}

type Props = Readonly<{
  toy: Toy;
  actions: ToyActions;
  stopPropagation?: boolean;
}>;

export default function ToyActionButtons({ toy, actions, stopPropagation }: Props) {
  const t = useTranslations('common');
  return <ActionButtons actions={toyActionDefs(t, toy, actions)} stopPropagation={stopPropagation} />;
}
