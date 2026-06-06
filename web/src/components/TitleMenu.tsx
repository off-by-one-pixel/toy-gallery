'use client';

import { Dropdown } from '@heroui/react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { APP_COMMIT_SHA, APP_VERSION } from '../config';
import { useAuth } from '../providers/AuthProvider';
import ActionDropdownMenu, { type ActionMenuItem } from './ActionDropdownMenu';

type Props = Readonly<{
  subtitle?: React.ReactNode;
}>;

export default function TitleMenu({ subtitle }: Props) {
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
      <Dropdown.Trigger className="group inline-flex items-baseline gap-2 rounded-md px-1 -mx-1 text-left transition-colors hover:bg-neutral-200/60">
        <span className="text-lg font-semibold tracking-tight text-neutral-900">{t('appTitle')}</span>
        {subtitle !== undefined && (
          <span className="inline-block min-w-22 text-sm font-normal text-neutral-500">{subtitle}</span>
        )}
        <ChevronDown
          size={10}
          strokeWidth={2.5}
          className="text-neutral-400 transition-colors group-hover:text-neutral-600"
        />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <ActionDropdownMenu items={items} />
        <div className="px-3 py-1.5 text-center font-mono text-[10px] text-neutral-400">
          {APP_VERSION}
          {APP_COMMIT_SHA && ` · ${APP_COMMIT_SHA}`}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
