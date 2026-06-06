'use client';

import { Dropdown } from '@heroui/react';
import { LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { APP_COMMIT_SHA, APP_VERSION } from '../config';
import { useAuth } from '../providers/AuthProvider';
import ActionDropdownMenu, { type ActionMenuItem } from './ActionDropdownMenu';

export default function AppMenu() {
  const t = useTranslations('collection');
  const router = useRouter();
  const { username, logout } = useAuth();

  const items: ActionMenuItem[] = [
    {
      id: 'settings',
      icon: Settings,
      label: t('menu.settingsLabel'),
      description: t('menu.settingsDescription'),
      onAction: () => router.push('/settings'),
    },
    {
      id: 'logout',
      icon: LogOut,
      label: t('menu.signOutLabel'),
      description: username
        ? t('menu.signOutDescriptionSignedIn', { username })
        : t('menu.signOutDescriptionAnonymous'),
      onAction: logout,
    },
  ];

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={t('menu.openMenu')}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900"
      >
        <Settings size={16} strokeWidth={1.8} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <ActionDropdownMenu items={items} />
        <div className="px-3 py-1.5 text-center font-mono text-[10px] text-neutral-400">
          {APP_VERSION}
          {APP_COMMIT_SHA && ` · ${APP_COMMIT_SHA}`}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
