import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DisabledReason from '@/components/DisabledReason';
import { hoverWithMouse } from '@/test/pointer';

const TRIGGER = '[data-slot="tooltip-trigger"]';

describe('DisabledReason', () => {
  it('renders the child alone when nothing blocks it', () => {
    const { container } = render(
      <DisabledReason reason={null}>
        <button type="button">Go</button>
      </DisabledReason>,
    );
    expect(container.querySelector(TRIGGER)).toBeNull();
    expect(screen.getByRole('button', { name: 'Go' })).toBeTruthy();
  });

  it('shows the reason when hovering a disabled child', async () => {
    const { container } = render(
      <DisabledReason reason="Still loading">
        <button type="button" disabled>
          Go
        </button>
      </DisabledReason>,
    );
    const trigger = container.querySelector(TRIGGER)!;
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    hoverWithMouse(trigger);
    expect(await screen.findByText('Still loading')).toBeTruthy();
  });
});
