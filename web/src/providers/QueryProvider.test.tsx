// @vitest-environment jsdom

import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QueryProvider } from './QueryProvider';

function Probe() {
  const defaults = useQueryClient().getDefaultOptions().queries;
  return <span>{`${defaults?.staleTime}:${defaults?.retry}:${defaults?.refetchOnWindowFocus}`}</span>;
}

describe('QueryProvider', () => {
  it('provides a client configured with the app defaults', () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(screen.getByText('30000:1:false')).toBeTruthy();
  });
});
