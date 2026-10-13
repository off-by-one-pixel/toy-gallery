import { Image as ImageIcon, LogOut, Settings, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';

import { rebuildRecords, refreshAllSessionMedia } from '@/api';
import { queryKeys, sessionDataKeys } from '@/api/queryKeys';
import type { ActionMenuItem } from '@/components/ActionDropdownMenu';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMediaStatus } from '@/features/sessions/media/useMediaStrip';
import { useApiMutation } from '@/hooks/useApi';
import { routes } from '@/routes';

export function useAppMenuItems(): ActionMenuItem[] {
  const t = useTranslations();
  const { navigate } = useNavigation();
  const { username, logout } = useAuth();
  const { configured } = useMediaStatus();

  const refreshMedia = useApiMutation({
    fn: refreshAllSessionMedia,
    success: (refreshed) => t('session.media.refreshedToast', { count: refreshed.sessionsWithMedia }),
    invalidates: [queryKeys.media.all, queryKeys.sessions.lists],
  });

  const rebuild = useApiMutation({
    fn: rebuildRecords,
    success: (count) => t('settings.data.rebuiltToast', { count }),
    invalidates: sessionDataKeys,
  });

  return [
    {
      id: 'settings',
      icon: Settings,
      label: t('collection.menu.settingsLabel'),
      description: t('collection.menu.settingsDescription'),
      onAction: () => navigate(routes.settings),
    },
    ...(configured
      ? [
          {
            id: 'refresh-media',
            icon: ImageIcon,
            label: t('session.media.refreshButtonLabel'),
            description: t('session.media.refreshButton'),
            onAction: () => void refreshMedia.run(),
          },
        ]
      : []),
    {
      id: 'rebuild-records',
      icon: Trophy,
      label: t('settings.data.rebuildLabel'),
      description: t('settings.data.rebuildDescription'),
      onAction: () => void rebuild.run(),
    },
    {
      id: 'logout',
      icon: LogOut,
      label: t('collection.menu.signOutLabel'),
      description: username
        ? t('collection.menu.signOutDescriptionSignedIn', { username })
        : t('collection.menu.signOutDescriptionAnonymous'),
      onAction: logout,
    },
  ];
}
