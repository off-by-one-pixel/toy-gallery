import { Image as ImageIcon, LogOut, Settings, Trophy, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';

import { rebuildRecords, refreshAllSessionMedia } from '@/api';
import { queryKeys, sessionDataKeys } from '@/api/queryKeys';
import type { ActionMenuItem } from '@/components/ActionDropdownMenu';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMediaStatus } from '@/features/sessions/media/useMediaStrip';
import { useApiMutation } from '@/hooks/useApi';

export type AppMenuContext = Readonly<{
  mediaConfigured: boolean;
  username: string | null;
}>;

export type AppMenuTranslator = (key: string, values?: Record<string, string | number>) => string;

type AppMenuActionId = 'settings' | 'refresh-media' | 'rebuild-records' | 'logout';

export type AppMenuActionDef = Readonly<{
  id: AppMenuActionId;
  icon: LucideIcon;
  label: (t: AppMenuTranslator) => string;
  description: (t: AppMenuTranslator, ctx: AppMenuContext) => string;
  visible?: (ctx: AppMenuContext) => boolean;
}>;

export const APP_MENU_ACTIONS: readonly AppMenuActionDef[] = [
  {
    id: 'settings',
    icon: Settings,
    label: (t) => t('collection.menu.settingsLabel'),
    description: (t) => t('collection.menu.settingsDescription'),
  },
  {
    id: 'refresh-media',
    icon: ImageIcon,
    label: (t) => t('session.media.refreshButtonLabel'),
    description: (t) => t('session.media.refreshButton'),
    visible: (ctx) => ctx.mediaConfigured,
  },
  {
    id: 'rebuild-records',
    icon: Trophy,
    label: (t) => t('settings.data.rebuildLabel'),
    description: (t) => t('settings.data.rebuildDescription'),
  },
  {
    id: 'logout',
    icon: LogOut,
    label: (t) => t('collection.menu.signOutLabel'),
    description: (t, ctx) =>
      ctx.username
        ? t('collection.menu.signOutDescriptionSignedIn', { username: ctx.username })
        : t('collection.menu.signOutDescriptionAnonymous'),
  },
];

export function useAppMenuItems(): ActionMenuItem[] {
  const t = useTranslations() as unknown as AppMenuTranslator;
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

  const ctx: AppMenuContext = { mediaConfigured: configured, username: username ?? null };
  const run: Record<AppMenuActionId, () => void> = {
    settings: () => navigate('/settings'),
    'refresh-media': () => void refreshMedia.run(),
    'rebuild-records': () => void rebuild.run(),
    logout,
  };

  return APP_MENU_ACTIONS.filter((action) => action.visible?.(ctx) ?? true).map((action) => ({
    id: action.id,
    icon: action.icon,
    label: action.label(t),
    description: action.description(t, ctx),
    onAction: run[action.id],
  }));
}
