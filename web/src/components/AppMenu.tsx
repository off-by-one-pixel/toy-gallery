'use client';

import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { APP_COMMIT_SHA, APP_VERSION } from '@/config';
import { useAppMenuItems } from '@/components/appMenuActions';
import ActionDropdownMenu from '@/components/ActionDropdownMenu';
import ActionDropdownMenuRow from '@/components/ActionDropdownMenuRow';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';

export default function AppMenu() {
  const t = useTranslations('collection');
  const items = useAppMenuItems();

  return (
    <ResponsiveOverlay
      label={t('menu.openMenu')}
      trigger={<Settings size={16} strokeWidth={1.8} />}
      triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-tertiary/60 hover:text-foreground"
      placement="bottom end"
    >
      {({ close, mode }) => (
        <>
          {mode === 'popover' ? (
            <ActionDropdownMenu items={items} />
          ) : (
            <div className="flex flex-col p-1.5">
              {items.map(({ id, icon: Icon, label, description, onAction }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    close();
                    onAction();
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-tertiary/60"
                >
                  <ActionDropdownMenuRow
                    icon={<Icon size={16} strokeWidth={1.8} />}
                    label={label}
                    description={description}
                  />
                </button>
              ))}
            </div>
          )}
          <div className="px-3 py-1.5 text-center font-mono text-caption text-text-tertiary">
            {APP_VERSION}
            {APP_COMMIT_SHA && ` · ${APP_COMMIT_SHA}`}
          </div>
        </>
      )}
    </ResponsiveOverlay>
  );
}
