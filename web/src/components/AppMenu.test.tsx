import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runFirst, runSecond } = vi.hoisted(() => ({ runFirst: vi.fn(), runSecond: vi.fn() }));

vi.mock('@/components/appMenuActions', async () => {
  const { Settings } = await import('lucide-react');
  return {
    useAppMenuItems: () => [
      { id: 'first', icon: Settings, label: 'First item', description: 'first description', onAction: runFirst },
      { id: 'second', icon: Settings, label: 'Second item', description: 'second description', onAction: runSecond },
    ],
  };
});

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

import en from '@/i18n/catalogs/en.json';
import { withAppProviders } from '@/test/render';
import AppMenu from '@/components/AppMenu';

const openMenu = async () => {
  render(withAppProviders(<AppMenu />));
  fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
  await screen.findByText('First item');
};

describe('AppMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('mounts the menu items provided by the registry', async () => {
    await openMenu();
    expect(screen.getByText('Second item')).toBeTruthy();
  });

  it('invokes the item action when its entry is clicked', async () => {
    await openMenu();
    fireEvent.click(screen.getByText('Second item'));
    expect(runSecond).toHaveBeenCalledTimes(1);
    expect(runFirst).not.toHaveBeenCalled();
  });
});
