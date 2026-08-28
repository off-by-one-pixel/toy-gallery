'use client';

import { Image as ImageIcon, LogOut, Settings, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { APP_COMMIT_SHA, APP_VERSION } from '@/config';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchMediaStatus, rebuildRecords, refreshAllSessionMedia } from '@/api';
import { queryKeys, sessionDataKeys } from '@/api/queryKeys';
import ActionDropdownMenu, { type ActionMenuItem } from '@/components/ActionDropdownMenu';
import ActionDropdownMenuRow from '@/components/ActionDropdownMenuRow';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';

export default function AppMenu() {
  const t = useTranslations('collection');
  const tMedia = useTranslations('session.media');
  const tData = useTranslations('settings.data');
  const router = useRouter();
  const { username, logout } = useAuth();
  const { data: status } = useApiQuery({ key: queryKeys.media.status, fn: fetchMediaStatus });
  const mediaConfigured = status?.configured ?? false;

  const refreshMedia = useApiMutation({
    fn: refreshAllSessionMedia,
    success: (refreshed) => tMedia('refreshedToast', { count: refreshed.sessionsWithMedia }),
    invalidates: [queryKeys.media.all, queryKeys.sessions.lists],
  });

  const rebuild = useApiMutation({
    fn: rebuildRecords,
    success: (count) => tData('rebuiltToast', { count }),
    invalidates: sessionDataKeys,
  });

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
            onAction: () => void refreshMedia.run(),
          } satisfies ActionMenuItem,
        ]
      : []),
    {
      id: 'rebuild-records',
      icon: Trophy,
      label: tData('rebuildLabel'),
      description: tData('rebuildDescription'),
      onAction: () => void rebuild.run(),
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
