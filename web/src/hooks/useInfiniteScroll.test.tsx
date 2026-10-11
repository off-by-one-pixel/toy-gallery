import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let lastCallback: IOCallback | null = null;
const observed: Element[] = [];

class IntersectionObserverStub {
  constructor(callback: IOCallback) {
    lastCallback = callback;
  }
  observe(target: Element) {
    observed.push(target);
  }
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

function Probe({ onHit, enabled }: Readonly<{ onHit: () => void; enabled: boolean }>) {
  const ref = useRef<HTMLDivElement>(null);
  useInfiniteScroll(ref, onHit, enabled);
  return <div ref={ref} />;
}

describe('useInfiniteScroll', () => {
  afterEach(() => {
    lastCallback = null;
    observed.length = 0;
  });

  it('observes the sentinel and fires onHit when it intersects', () => {
    const onHit = vi.fn();
    render(<Probe onHit={onHit} enabled />);
    expect(observed).toHaveLength(1);
    lastCallback?.([{ isIntersecting: false }]);
    expect(onHit).not.toHaveBeenCalled();
    lastCallback?.([{ isIntersecting: true }]);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('does not observe when disabled', () => {
    render(<Probe onHit={vi.fn()} enabled={false} />);
    expect(observed).toHaveLength(0);
  });
});
