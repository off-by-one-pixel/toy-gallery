'use client';

import type { ComponentProps } from 'react';
import { Button, Tooltip } from '@heroui/react';
import { type LucideIcon, Pencil, Trash2 } from 'lucide-react';

const TOOLTIP_DELAY_MS = 200;
const ICON_SIZE = 13;
const FAB_ICON_SIZE = 16;
const ICON_STROKE_WIDTH = 1.8;

type ButtonVariant = ComponentProps<typeof Button>['variant'];

export type ActionDef = Readonly<{
  key: string;
  label: string;
  icon: LucideIcon;
  variant: ButtonVariant;
  onPress: () => void;
  className?: string;
  iconStrokeWidth?: number;
  fabIconSize?: number;
}>;

export function editDeleteActions(
  t: (key: 'edit' | 'delete') => string,
  onEdit: () => void,
  onDelete: () => void,
): readonly [ActionDef, ActionDef] {
  return [
    { key: 'edit', label: t('edit'), icon: Pencil, variant: 'outline', onPress: onEdit },
    { key: 'delete', label: t('delete'), icon: Trash2, variant: 'danger-soft', onPress: onDelete },
  ];
}

type Props = Readonly<{
  actions: readonly ActionDef[];
  stopPropagation?: boolean;
}>;

export function ActionButtons({ actions, stopPropagation }: Props) {
  const stop = stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined;
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

export function ActionFabs({ actions }: Readonly<{ actions: readonly ActionDef[] }>) {
  return (
    <>
      {actions.map(({ key, label, icon: Icon, variant, onPress, className, fabIconSize }) => (
        <Button
          key={key}
          variant={variant === 'danger-soft' ? 'danger' : variant}
          size="sm"
          aria-label={label}
          className={`h-12 w-12 rounded-full shadow-lg ${variant === 'outline' ? 'bg-surface' : ''} ${className ?? ''}`}
          onPress={onPress}
        >
          <Icon size={fabIconSize ?? FAB_ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        </Button>
      ))}
    </>
  );
}

export function ActionBar({ actions }: Readonly<{ actions: readonly ActionDef[] }>) {
  return (
    <>
      {actions.map(({ key, label, icon: Icon, variant, onPress, className, iconStrokeWidth }) => (
        <Button key={key} variant={variant} size="sm" className={`max-sm:hidden ${className ?? ''}`} onPress={onPress}>
          <Icon size={14} strokeWidth={iconStrokeWidth ?? 2.2} />
          <span className="hidden md:inline">{label}</span>
        </Button>
      ))}
    </>
  );
}
