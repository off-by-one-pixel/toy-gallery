'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ActionDef } from '@/components/ActionButtons';
import { useLiveSession } from '@/features/sessions/live/useLiveSession';
import type { Session } from '@/api/types';
import { useApiMutation } from '@/hooks/useApi';

export function useStartLiveAction(onStarted?: (session: Session) => void): ActionDef | null {
  const { liveSession, isLoaded, start } = useLiveSession();
  const t = useTranslations('session.live');
  const startAction = useApiMutation({ fn: start, onSuccess: onStarted });
  if (!isLoaded || liveSession) return null;
  return {
    key: 'start-live',
    label: t('startButton'),
    icon: Play,
    variant: 'primary',
    className: 'bg-live-strong text-white hover:bg-live',
    fabIconSize: 22,
    onPress: () => void startAction.run(),
  };
}
