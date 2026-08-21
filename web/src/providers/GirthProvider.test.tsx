// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { GirthProvider, useGirth } from '@/providers/GirthProvider';

function Probe() {
  const { girth, setGirth } = useGirth();
  return (
    <button type="button" onClick={() => setGirth(girth === 'circumference' ? 'diameter' : 'circumference')}>
      {girth}
    </button>
  );
}

describe('GirthProvider', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to circumference and switches on demand', () => {
    render(
      <GirthProvider>
        <Probe />
      </GirthProvider>,
    );
    const probe = screen.getByRole('button');
    expect(probe.textContent).toBe('circumference');
    fireEvent.click(probe);
    expect(probe.textContent).toBe('diameter');
    expect(localStorage.getItem('girth')).toBe('diameter');
  });

  it('restores the persisted choice on mount and ignores junk', () => {
    localStorage.setItem('girth', 'diameter');
    const first = render(
      <GirthProvider>
        <Probe />
      </GirthProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('diameter');
    first.unmount();

    localStorage.setItem('girth', 'nonsense');
    render(
      <GirthProvider>
        <Probe />
      </GirthProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('circumference');
  });

  it('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow('useGirth must be used within GirthProvider');
  });
});
