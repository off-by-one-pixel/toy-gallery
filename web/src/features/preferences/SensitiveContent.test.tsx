import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import PrivacyToggle from '@/features/preferences/PrivacyToggle';
import SensitiveContent from '@/features/preferences/SensitiveContent';
import { withAppProviders } from '@/test/render';

const wrap = (ui: React.ReactNode) =>
  withAppProviders(
    <>
      <PrivacyToggle />
      <SensitiveContent>{ui}</SensitiveContent>
    </>,
  );

describe('SensitiveContent', () => {
  beforeEach(() => localStorage.clear());

  it('renders children unwrapped when sensitive content is visible', () => {
    render(wrap(<button type="button">secret</button>));
    const child = screen.getByText('secret');
    expect(child.parentElement?.getAttribute('inert')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Hide sensitive content' })).toBeTruthy();
  });

  it('blurs and inerts children when hiding is toggled on', () => {
    render(wrap(<button type="button">secret</button>));
    fireEvent.click(screen.getByRole('switch', { name: 'Hide sensitive content' }));
    const child = screen.getByText('secret', { ignore: '[aria-hidden] *:not(button)' });
    const shield = child.closest('[inert]');
    expect(shield).not.toBeNull();
    expect(shield?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Show sensitive content' })).toBeTruthy();
  });

  it('persists the choice and restores it on next mount', () => {
    const { unmount } = render(wrap(<span>secret</span>));
    fireEvent.click(screen.getByRole('switch', { name: 'Hide sensitive content' }));
    expect(localStorage.getItem('hideSensitive')).toBe('true');
    unmount();

    render(wrap(<span>secret</span>));
    expect(screen.getByRole('switch', { name: 'Show sensitive content' })).toBeTruthy();
    expect(screen.getByText('secret').closest('[inert]')).not.toBeNull();
  });
});
