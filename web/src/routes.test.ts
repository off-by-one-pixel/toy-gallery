import { describe, expect, it } from 'vitest';

import { routes } from '@/routes';

const parse = (href: string) => new URL(href, 'http://app.test');

describe('routes', () => {
  it('nests session pages under the sessions list', () => {
    expect(routes.sessions.new.startsWith(`${routes.sessions.list}/`)).toBe(true);
    expect(parse(routes.sessions.edit(5)).pathname.startsWith(`${routes.sessions.list}/`)).toBe(true);
  });

  it('carries the session id to the edit page', () => {
    expect(parse(routes.sessions.edit(5)).searchParams.get('id')).toBe('5');
  });

  it('round-trips a return path with its own query through login', () => {
    const next = `${routes.sessions.list}?id=1&toys=2,3`;
    expect(parse(routes.login(next)).searchParams.get('next')).toBe(next);
  });
});
