'use client';

import { type RefObject, useEffect, useRef } from 'react';

export function useInfiniteScroll(sentinelRef: RefObject<Element | null>, onHit: () => void, enabled: boolean): void {
  const onHitRef = useRef(onHit);
  onHitRef.current = onHit;

  useEffect(() => {
    const target = sentinelRef.current;
    if (!enabled || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onHitRef.current();
      },
      { root: null, rootMargin: '600px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [sentinelRef, enabled]);
}
