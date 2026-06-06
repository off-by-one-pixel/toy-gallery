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
  danger?: boolean;
}>;

type Props = Readonly<{
  items: ActionMenuItem[];
  disabledKeys?: string[];
}>;

export default function ActionDropdownMenu({ items, disabledKeys }: Props) {
  return (
    <Dropdown.Menu disabledKeys={disabledKeys ?? []}>
      {items.map(({ id, icon: Icon, label, description, onAction, danger }) => (
        <Dropdown.Item key={id} id={id} onAction={onAction}>
          <ActionDropdownMenuRow
            icon={
              <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} className={danger ? 'text-danger' : undefined} />
            }
            label={danger ? <span className="text-danger">{label}</span> : label}
            description={description}
          />
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );
}
