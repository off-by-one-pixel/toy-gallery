import { vi } from 'vitest';

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

export const observerCallbacks: IOCallback[] = [];
export const observedElements: Element[] = [];

class IntersectionObserverStub {
  constructor(callback: IOCallback) {
    observerCallbacks.push(callback);
  }
  observe(target: Element) {
    observedElements.push(target);
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
}

export const stubIntersectionObserver = () => vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

export const resetIntersectionObserver = () => {
  observerCallbacks.length = 0;
  observedElements.length = 0;
};

export const intersect = (isIntersecting: boolean) => observerCallbacks.at(-1)?.([{ isIntersecting }]);
