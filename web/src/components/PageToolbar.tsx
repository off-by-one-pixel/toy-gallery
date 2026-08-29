'use client';

import type { ReactNode } from 'react';

import { ActionBar, type ActionDef } from '@/components/ActionButtons';
import DisplayOptionsMenu from '@/components/DisplayOptionsMenu';
import GirthToggle from '@/features/preferences/GirthToggle';
import PrivacyToggle from '@/features/preferences/PrivacyToggle';
import UnitToggle from '@/features/preferences/UnitToggle';
import LiveSessionBanner from '@/features/sessions/live/LiveSessionBanner';

type Props = Readonly<{
  start: ReactNode;
  menuExtrasStart?: ReactNode;
  menuExtrasEnd?: ReactNode;
  inlineExtras?: ReactNode;
  actions: ActionDef[];
  growStart?: boolean;
  children?: ReactNode;
}>;

export default function PageToolbar({
  start,
  menuExtrasStart,
  menuExtrasEnd,
  inlineExtras,
  actions,
  growStart = false,
  children,
}: Props) {
  return (
    <header className="sticky top-0 z-10 border-y border-border bg-surface-secondary/90 backdrop-blur-sm">
      <LiveSessionBanner />
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 py-2.5 sm:flex-nowrap sm:gap-3 sm:px-6">
        {start}
        <div className="hidden sm:contents">
          {inlineExtras}
          <UnitToggle />
          <GirthToggle />
        </div>
        <div className={growStart ? 'hidden flex-1 sm:block' : 'flex-1'} />
        <DisplayOptionsMenu>
          {menuExtrasStart}
          <UnitToggle />
          <GirthToggle />
          {menuExtrasEnd}
        </DisplayOptionsMenu>
        <ActionBar actions={actions} />
        <PrivacyToggle />
      </div>
      {children}
    </header>
  );
}
