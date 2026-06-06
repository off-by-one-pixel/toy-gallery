'use client';

import type { ReactNode } from 'react';

import SectionTabs from './SectionTabs';
import TitleMenu from './TitleMenu';

type Props = Readonly<{
  subtitle?: ReactNode;
}>;

export default function TopBar({ subtitle }: Props) {
  return (
    <div className="bg-neutral-100/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <h1 className="m-0">
          <TitleMenu subtitle={subtitle} />
        </h1>
        <SectionTabs />
      </div>
    </div>
  );
}
