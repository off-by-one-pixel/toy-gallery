'use client';

import { Copy, CopyPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Toy } from '@/api/types';
import { ActionButtons, type ActionDef, editDeleteActions } from '@/components/ActionButtons';

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
  const [edit, remove] = editDeleteActions(
    t,
    () => onEdit(toy),
    () => onDelete(toy),
  );
  return [
    edit,
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
    remove,
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
