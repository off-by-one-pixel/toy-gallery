// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { createPersistedProvider } from './createPersistedProvider';

const { Provider, useValue } = createPersistedProvider<number>({
  storageKey: 'test.count',
  defaultValue: 1,
  decode: (stored) => (/^\d+$/.test(stored) ? Number(stored) : undefined),
  encode: (count) => `v${count}`,
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

  it('starts from the default and persists updates through encode', () => {
    renderProbe();
    const probe = screen.getByRole('button');
    expect(probe.textContent).toBe('1');
    fireEvent.click(probe);
    expect(probe.textContent).toBe('2');
    expect(localStorage.getItem('test.count')).toBe('v2');
  });

  it.each([
    ['7', '7'],
    ['0', '0'],
    ['junk', '1'],
  ])('hydrates stored "%s" and renders "%s"', (stored, expected) => {
    localStorage.setItem('test.count', stored);
    renderProbe();
    expect(screen.getByRole('button').textContent).toBe(expected);
  });

  it('throws the configured message outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useValue must be used within Provider');
  });
});
