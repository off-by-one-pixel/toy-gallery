'use client';

import { ToggleButtonGroup } from '@heroui/react';
import type { ReactNode } from 'react';

type Props<T extends string> = {
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  children: ReactNode;
};

export default function SegmentedToggle<T extends string>({
  value,
  onChange,
  ariaLabel,
  children,
}: Readonly<Props<T>>) {
  return (
    <ToggleButtonGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => onChange([...keys][0] as T)}
      aria-label={ariaLabel}
      size="sm"
    >
      {children}
    </ToggleButtonGroup>
  );
}
