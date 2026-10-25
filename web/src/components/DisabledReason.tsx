'use client';

import type { ReactNode } from 'react';
import { Tooltip } from '@heroui/react';

const TOOLTIP_DELAY_MS = 200;

type Props = Readonly<{
  reason: string | null;
  children: ReactNode;
}>;

export default function DisabledReason({ reason, children }: Props) {
  if (reason === null) return children;
  return (
    <Tooltip delay={TOOLTIP_DELAY_MS}>
      <Tooltip.Trigger aria-disabled className="inline-flex">
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content>{reason}</Tooltip.Content>
    </Tooltip>
  );
}
