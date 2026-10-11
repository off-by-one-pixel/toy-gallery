'use client';

import { Dropdown } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';

import ActionDropdownMenuRow from '@/components/ActionDropdownMenuRow';

const ICON_SIZE = 14;
const ICON_STROKE_WIDTH = 1.8;

export type ActionMenuItem = Readonly<{
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  onAction: () => void;
}>;

type Props = Readonly<{
  items: ActionMenuItem[];
}>;

export default function ActionDropdownMenu({ items }: Props) {
  return (
    <Dropdown.Menu>
      {items.map(({ id, icon: Icon, label, description, onAction }) => (
        <Dropdown.Item key={id} id={id} onAction={onAction}>
          <ActionDropdownMenuRow
            icon={<Icon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />}
            label={label}
            description={description}
          />
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  );
}
