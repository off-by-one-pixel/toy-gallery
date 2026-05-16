'use client';

import type { ReactNode } from 'react';

import CollectionMenu from './CollectionMenu';
import SectionTabs from './SectionTabs';

type Props = Readonly<{
  subtitle?: ReactNode;
  onImported: () => void;
  onChangePassword: () => void;
}>;

/** Shared chrome row across the gallery and sessions pages. Pure
 *  layout — knows nothing about URL state. The page owns the password
 *  modal lifecycle and passes `onChangePassword`. */
export default function TopBar({ subtitle, onImported, onChangePassword }: Props) {
  return (
    <div className="bg-neutral-100/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <h1 className="m-0">
          <CollectionMenu onImported={onImported} onChangePassword={onChangePassword} subtitle={subtitle} />
        </h1>
        <SectionTabs />
      </div>
    </div>
  );
}
