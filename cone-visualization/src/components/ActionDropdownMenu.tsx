'use client';

import { Dropdown } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';

import ActionDropdownMenuRow from './ActionDropdownMenuRow';

const ICON_SIZE = 14;
const ICON_STROKE_WIDTH = 1.8;

export type ActionMenuItem = Readonly<{
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  onAction: () => void;
  /** Renders icon in red-500 and wraps the label in a red-600 span. */
  danger?: boolean;
}>;

type Props = Readonly<{
  items: ActionMenuItem[];
  disabledKeys?: string[];
}>;

/** Inner contents of a HeroUI Dropdown: items rendered through MenuRow with
 *  consistent icon sizing and danger styling. Wrap with <Dropdown.Popover>
 *  in the consumer when popover placement / footer differs. */
export default function ActionDropdownMenu({ items, disabledKeys }: Props) {
  return (
    <Dropdown.Menu disabledKeys={disabledKeys ?? []}>
      {items.map(({ id, icon: Icon, label, description, onAction, danger }) => (
        <Dropdown.Item key={id} id={id} onAction={onAction}>
          <ActionDropdownMenuRow
            icon={
              <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} className={danger ? 'text-red-500' : undefined} />
            }
            label={danger ? <span className="text-red-600">{label}</span> : label}
            description={description}
          />
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );
}
