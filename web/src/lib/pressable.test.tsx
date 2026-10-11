import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { pressable } from '@/lib/pressable';

const renderPressable = () => {
  const onPress = vi.fn();
  render(
    <div {...pressable(onPress)} aria-label="card">
      <button type="button">inner</button>
    </div>,
  );
  return { onPress, card: screen.getByRole('button', { name: 'card' }) };
};

describe('pressable', () => {
  it('makes the element a focusable button', () => {
    const { card } = renderPressable();
    expect(card.tabIndex).toBe(0);
  });

  it('presses on click', () => {
    const { onPress, card } = renderPressable();
    fireEvent.click(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['Enter', ' '])('presses on %j and prevents its default', (key) => {
    const { onPress, card } = renderPressable();
    expect(fireEvent.keyDown(card, { key })).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const { onPress, card } = renderPressable();
    expect(fireEvent.keyDown(card, { key: 'a' })).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('leaves keys pressed on nested elements alone', () => {
    const { onPress } = renderPressable();
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'inner' }), { key: 'Enter' })).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });
});
