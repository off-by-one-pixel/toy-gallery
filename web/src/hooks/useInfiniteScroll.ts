'use client';

import { type RefObject, useEffect, useEffectEvent } from 'react';

export function useInfiniteScroll(sentinelRef: RefObject<Element | null>, onHit: () => void, enabled: boolean): void {
  const handleHit = useEffectEvent(onHit);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!enabled || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) handleHit();
      },
      { root: null, rootMargin: '600px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [sentinelRef, enabled]);
}
