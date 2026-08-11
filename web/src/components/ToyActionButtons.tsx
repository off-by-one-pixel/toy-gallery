'use client';

import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionButtons, type ActionDef } from './ActionButtons';

type Props = Readonly<{
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  stopPropagation?: boolean;
}>;

export function toyActionDefs(
  t: (key: 'edit' | 'copy' | 'delete') => string,
  handlers: Pick<Props, 'onEdit' | 'onCopy' | 'onDelete'>,
): ActionDef[] {
  return [
    { key: 'edit', label: t('edit'), icon: Pencil, variant: 'outline', onPress: handlers.onEdit },
    { key: 'copy', label: t('copy'), icon: Copy, variant: 'outline', onPress: handlers.onCopy },
    { key: 'delete', label: t('delete'), icon: Trash2, variant: 'danger-soft', onPress: handlers.onDelete },
  ];
}

export default function ToyActionButtons({ onEdit, onCopy, onDelete, stopPropagation }: Props) {
  const t = useTranslations('common');
  return <ActionButtons actions={toyActionDefs(t, { onEdit, onCopy, onDelete })} stopPropagation={stopPropagation} />;
}
