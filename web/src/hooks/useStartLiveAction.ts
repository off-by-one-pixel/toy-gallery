'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ActionDef } from '../components/ActionButtons';
import { useLiveSession } from '../providers/LiveSessionProvider';
import type { Session } from '../services/types';
import { useAsyncAction } from './useAsyncAction';

export function useStartLiveAction(onStarted?: (session: Session) => void): ActionDef | null {
  const { liveSession, isLoaded, start } = useLiveSession();
  const t = useTranslations('session.live');
  const runToast = useAsyncAction();
  if (!isLoaded || liveSession) return null;
  return {
    key: 'start-live',
    label: t('startButton'),
    icon: Play,
    variant: 'primary',
    className: 'bg-emerald-600 text-white hover:bg-emerald-500',
    fabIconSize: 22,
    onPress: () => void runToast(start, onStarted ? { onSuccess: onStarted } : {}),
  };
}
