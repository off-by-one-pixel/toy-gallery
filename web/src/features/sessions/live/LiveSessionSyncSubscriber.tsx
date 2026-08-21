'use client';

import { useLiveSessionSync } from '@/features/sessions/live/useLiveSession';

export default function LiveSessionSyncSubscriber() {
  useLiveSessionSync();
  return null;
}
