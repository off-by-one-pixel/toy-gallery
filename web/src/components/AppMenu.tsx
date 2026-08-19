'use client';

import { useEffect, useState } from 'react';
import { Dropdown, Toast } from '@heroui/react';
import { Image as ImageIcon, LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { APP_COMMIT_SHA, APP_VERSION } from '../config';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useAuth } from '../providers/AuthProvider';
import { fetchMediaIndicators, MEDIA_INDICATORS_CHANGED_EVENT, refreshAllSessionMedia } from '../services/api';
import ActionDropdownMenu, { type ActionMenuItem } from './ActionDropdownMenu';

export default function AppMenu() {
  const t = useTranslations('collection');
  const tMedia = useTranslations('session.media');
  const router = useRouter();
  const { username, logout } = useAuth();
  const runToast = useAsyncAction();
  const [mediaConfigured, setMediaConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMediaIndicators()
      .then((indicators) => {
        if (!cancelled) setMediaConfigured(indicators.configured);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshMedia = () => {
    void runToast(refreshAllSessionMedia, {
      onSuccess: (indicators) => {
        Toast.toast.success(tMedia('refreshedToast', { count: indicators.sessionIds.size }));
        window.dispatchEvent(new Event(MEDIA_INDICATORS_CHANGED_EVENT));
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
