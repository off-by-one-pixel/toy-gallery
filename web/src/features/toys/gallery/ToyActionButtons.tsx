'use client';

import { Copy, CopyPlus, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionButtons, type ActionDef } from '@/components/ActionButtons';

type Props = Readonly<{
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onGhost?: () => void;
  stopPropagation?: boolean;
}>;

export function toyActionDefs(
  t: (key: 'edit' | 'copy' | 'delete' | 'compare') => string,
  handlers: Pick<Props, 'onEdit' | 'onCopy' | 'onDelete' | 'onGhost'>,
): ActionDef[] {
  return [
    { key: 'edit', label: t('edit'), icon: Pencil, variant: 'outline', onPress: handlers.onEdit },
    { key: 'copy', label: t('copy'), icon: Copy, variant: 'outline', onPress: handlers.onCopy },
    ...(handlers.onGhost
      ? [
          {
            key: 'ghost',
            label: t('compare'),
            icon: CopyPlus,
            variant: 'outline',
            onPress: handlers.onGhost,
          } satisfies ActionDef,
        ]
      : []),
    { key: 'delete', label: t('delete'), icon: Trash2, variant: 'danger-soft', onPress: handlers.onDelete },
  ];
}

export default function ToyActionButtons({ onEdit, onCopy, onDelete, onGhost, stopPropagation }: Props) {
  const t = useTranslations('common');
  return (
    <ActionButtons
      actions={toyActionDefs(t, { onEdit, onCopy, onDelete, onGhost })}
      stopPropagation={stopPropagation}
    />
  );
}
