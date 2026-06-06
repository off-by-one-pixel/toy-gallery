'use client';

import { Dropdown } from '@heroui/react';
import { Globe } from 'lucide-react';

export type LocaleOption = Readonly<{ code: string; label: string }>;

type Props = Readonly<{
  value: string;
  options: readonly LocaleOption[];
  onChange: (code: string) => void;
}>;

export default function LocaleSwitcher({ value, options, onChange }: Props) {
  const current = options.find((o) => o.code === value);

  return (
    <Dropdown>
      <Dropdown.Trigger className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary">
        <Globe size={14} strokeWidth={2} className="text-muted" />
        <span>{current?.label ?? value}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu selectedKeys={[value]} onAction={(key) => onChange(String(key))}>
          {options.map((option) => (
            <Dropdown.Item key={option.code} id={option.code}>
              {option.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
