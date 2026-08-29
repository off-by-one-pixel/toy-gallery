// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TopBarProvider, useSetTopBarSubtitle, useTopBarSubtitle } from '@/components/TopBarProvider';

function Display() {
  return <output>{useTopBarSubtitle() ?? 'none'}</output>;
}

function Page({ subtitle }: Readonly<{ subtitle: string | null }>) {
  useSetTopBarSubtitle(subtitle);
  return null;
}

describe('TopBarProvider', () => {
  it('carries the page subtitle to the reader', () => {
    render(
      <TopBarProvider>
        <Display />
        <Page subtitle="41 recorded" />
      </TopBarProvider>,
    );
    expect(screen.getByRole('status').textContent).toBe('41 recorded');
  });

  it('clears the subtitle when the page unmounts', () => {
    const view = render(
      <TopBarProvider>
        <Display />
        <Page subtitle="41 recorded" />
      </TopBarProvider>,
    );
    view.rerender(
      <TopBarProvider>
        <Display />
      </TopBarProvider>,
    );
    expect(screen.getByRole('status').textContent).toBe('none');
  });

  it('is inert without a provider', () => {
    render(
      <>
        <Display />
        <Page subtitle="ignored" />
      </>,
    );
    expect(screen.getByRole('status').textContent).toBe('none');
  });
});
