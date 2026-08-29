// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { createPersistedProvider } from '@/providers/createPersistedProvider';

const { Provider, useValue } = createPersistedProvider<number>({
  storageKey: 'test.count',
  defaultValue: 1,
  isValid: (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0,
  errorMessage: 'useValue must be used within Provider',
});

function Probe() {
  const { value, setValue } = useValue();
  return (
    <button type="button" onClick={() => setValue(value + 1)}>
      {value}
    </button>
  );
}

const renderProbe = () =>
  render(
    <Provider>
      <Probe />
    </Provider>,
  );

describe('createPersistedProvider', () => {
  beforeEach(() => localStorage.clear());

  it('starts from the default and persists updates', () => {
    renderProbe();
    const probe = screen.getByRole('button');
    expect(probe.textContent).toBe('1');
    fireEvent.click(probe);
    expect(probe.textContent).toBe('2');
    expect(localStorage.getItem('test.count')).toBe('2');
  });

  it('hydrates the stored value through isValid', () => {
    localStorage.setItem('test.count', '7');
    renderProbe();
    expect(screen.getByRole('button').textContent).toBe('7');
  });

  it('throws the configured message outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useValue must be used within Provider');
  });
});
