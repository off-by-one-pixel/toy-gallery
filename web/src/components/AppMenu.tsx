'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dropdown, Toast } from '@heroui/react';
import { Image as ImageIcon, LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { APP_COMMIT_SHA, APP_VERSION } from '@/config';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchMediaIndicators, refreshAllSessionMedia } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import ActionDropdownMenu, { type ActionMenuItem } from '@/components/ActionDropdownMenu';

export default function AppMenu() {
  const t = useTranslations('collection');
  const tMedia = useTranslations('session.media');
  const router = useRouter();
  const { username, logout } = useAuth();
  const runToast = useAsyncAction();
  const queryClient = useQueryClient();
  const { data: indicators } = useQuery({ queryKey: queryKeys.media.indicators, queryFn: fetchMediaIndicators });
  const mediaConfigured = indicators?.configured ?? false;

  const refreshMedia = () => {
    void runToast(refreshAllSessionMedia, {
      onSuccess: (refreshed) => {
        Toast.toast.success(tMedia('refreshedToast', { count: refreshed.sessionIds.size }));
        void queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
      },
    });
  };

  const items: ActionMenuItem[] = [
    {
      id: 'settings',
      icon: Settings,
      label: t('menu.settingsLabel'),
      description: t('menu.settingsDescription'),
      onAction: () => router.push('/settings'),
    },
    ...(mediaConfigured
      ? [
          {
            id: 'refresh-media',
            icon: ImageIcon,
            label: tMedia('refreshButtonLabel'),
            description: tMedia('refreshButton'),
            onAction: refreshMedia,
          } satisfies ActionMenuItem,
        ]
      : []),
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-tertiary/60 hover:text-foreground"
      >
        <Settings size={16} strokeWidth={1.8} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <ActionDropdownMenu items={items} />
        <div className="px-3 py-1.5 text-center font-mono text-caption text-text-tertiary">
          {APP_VERSION}
          {APP_COMMIT_SHA && ` · ${APP_COMMIT_SHA}`}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
