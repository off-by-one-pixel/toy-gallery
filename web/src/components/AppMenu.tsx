'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Toast } from '@heroui/react';
import { Image as ImageIcon, LogOut, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { APP_COMMIT_SHA, APP_VERSION } from '@/config';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchMediaStatus, refreshAllSessionMedia } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import ActionDropdownMenu, { type ActionMenuItem } from '@/components/ActionDropdownMenu';
import ActionDropdownMenuRow from '@/components/ActionDropdownMenuRow';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';

export default function AppMenu() {
  const t = useTranslations('collection');
  const tMedia = useTranslations('session.media');
  const router = useRouter();
  const { username, logout } = useAuth();
  const runToast = useAsyncAction();
  const queryClient = useQueryClient();
  const { data: status } = useQuery({ queryKey: queryKeys.media.status, queryFn: fetchMediaStatus });
  const mediaConfigured = status?.configured ?? false;

  const refreshMedia = () => {
    void runToast(refreshAllSessionMedia, {
      onSuccess: (refreshed) => {
        Toast.toast.success(tMedia('refreshedToast', { count: refreshed.sessionsWithMedia }));
        void queryClient.invalidateQueries({ queryKey: queryKeys.media.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists });
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
