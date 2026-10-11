import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  intersect,
  observedElements,
  resetIntersectionObserver,
  stubIntersectionObserver,
} from '@/test/intersectionObserver';

stubIntersectionObserver();

function Probe({ onHit, enabled }: Readonly<{ onHit: () => void; enabled: boolean }>) {
  const ref = useRef<HTMLDivElement>(null);
  useInfiniteScroll(ref, onHit, enabled);
  return <div ref={ref} />;
}

describe('useInfiniteScroll', () => {
  afterEach(resetIntersectionObserver);

  it('observes the sentinel and fires onHit when it intersects', () => {
    const onHit = vi.fn();
    render(<Probe onHit={onHit} enabled />);
    expect(observedElements).toHaveLength(1);
    intersect(false);
    expect(onHit).not.toHaveBeenCalled();
    intersect(true);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('does not observe when disabled', () => {
    render(<Probe onHit={vi.fn()} enabled={false} />);
    expect(observedElements).toHaveLength(0);
  });
});
