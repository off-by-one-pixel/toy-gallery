'use client';

import type { ComponentProps } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { Copy, type LucideIcon, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const TOOLTIP_DELAY_MS = 200;
const ICON_SIZE = 13;
const ICON_STROKE_WIDTH = 1.8;

type ButtonVariant = ComponentProps<typeof Button>['variant'];

type ActionDef = Readonly<{
  key: string;
  label: string;
  icon: LucideIcon;
  variant: ButtonVariant;
  onPress: () => void;
}>;

type Props = Readonly<{
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  /** Stop click propagation on each button. Needed when the action group is
   *  rendered inside a clickable parent (e.g. card-as-button), where a bare
   *  click on the action would also fire the parent's handler. */
  stopPropagation?: boolean;
}>;

export default function ToyActionButtons({ onEdit, onCopy, onDelete, stopPropagation }: Props) {
  const t = useTranslations('common');
  const stop = stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined;
  const actions: ActionDef[] = [
    { key: 'edit', label: t('edit'), icon: Pencil, variant: 'outline', onPress: onEdit },
    { key: 'copy', label: t('copy'), icon: Copy, variant: 'outline', onPress: onCopy },
    { key: 'delete', label: t('delete'), icon: Trash2, variant: 'danger-soft', onPress: onDelete },
  ];
  return (
    <>
      {actions.map(({ key, label, icon: Icon, variant, onPress }) => (
        <Tooltip key={key} delay={TOOLTIP_DELAY_MS}>
          <Button variant={variant} size="sm" isIconOnly aria-label={label} onPress={onPress} onClick={stop}>
            <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
          </Button>
          <Tooltip.Content>{label}</Tooltip.Content>
        </Tooltip>
      ))}
    </>
  );
}
