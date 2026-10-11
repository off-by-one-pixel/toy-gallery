import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useGirth } from '@/features/preferences/useGirth';

function Probe() {
  const { girth, setGirth } = useGirth();
  return (
    <button type="button" onClick={() => setGirth(girth === 'circumference' ? 'diameter' : 'circumference')}>
      {girth}
    </button>
  );
}

describe('useGirth', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to circumference and switches on demand', () => {
    render(<Probe />);
    const probe = screen.getByRole('button');
    expect(probe.textContent).toBe('circumference');
    fireEvent.click(probe);
    expect(probe.textContent).toBe('diameter');
    expect(localStorage.getItem('girth')).toBe(JSON.stringify('diameter'));
  });

  it('restores the persisted choice on mount', () => {
    localStorage.setItem('girth', JSON.stringify('diameter'));
    render(<Probe />);
    expect(screen.getByRole('button').textContent).toBe('diameter');
  });
});
