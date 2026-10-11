import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import { Involvement } from '@/api/types';
import ToyChipSelector from '@/features/sessions/form/ToyChipSelector';
import { makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';

const renderChip = () => {
  const onChange = vi.fn();
  const onClearDuration = vi.fn();
  render(
    withAppProviders(
      <ToyChipSelector
        toy={makeToy({ id: 1, name: 'Steel' })}
        state={Involvement.USED}
        duration={30}
        wholeSessionMinutes={null}
        onChange={onChange}
        onAddDuration={vi.fn()}
        onSetDuration={vi.fn()}
        onClearDuration={onClearDuration}
      />,
    ),
  );
  return { onChange, onClearDuration, chip: screen.getAllByRole('button')[0] };
};

describe('ToyChipSelector keyboard', () => {
  it.each(['Enter', ' '])('cycles the involvement when %j is pressed on the chip', (key) => {
    const { onChange, chip } = renderChip();
    fireEvent.keyDown(chip, { key });
    expect(onChange).toHaveBeenCalledWith(Involvement.INSERTED);
  });

  it.each(['Enter', ' '])('leaves %j on a control inside the chip to that control', (key) => {
    const { onChange, chip } = renderChip();
    const clear = screen.getByRole('button', { name: en.session.duration.clearLabel });
    expect(chip.contains(clear)).toBe(true);
    const notPrevented = fireEvent.keyDown(clear, { key });
    expect(onChange).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });
});
