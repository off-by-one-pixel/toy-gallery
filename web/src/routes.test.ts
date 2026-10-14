import { describe, expect, it } from 'vitest';

import { routeParams, routes } from '@/routes';

const parse = (href: string) => new URL(href, 'http://app.test');

describe('routes', () => {
  it('nests session pages under the sessions list', () => {
    expect(routes.sessions.new.startsWith(`${routes.sessions.list}/`)).toBe(true);
    expect(parse(routes.sessions.edit(5)).pathname.startsWith(`${routes.sessions.list}/`)).toBe(true);
  });

  it('links to the sessions list with a session selected or a toy filtered', () => {
    expect(parse(routes.sessions.selected(5)).pathname).toBe(routes.sessions.list);
    expect(parse(routes.sessions.forToy(3)).pathname).toBe(routes.sessions.list);
  });

  it('carries ids in their route params', () => {
    expect(parse(routes.sessions.edit(5)).searchParams.get(routeParams.sessionId)).toBe('5');
    expect(parse(routes.sessions.selected(5)).searchParams.get(routeParams.sessionId)).toBe('5');
    expect(parse(routes.sessions.forToy(3)).searchParams.get(routeParams.toyIds)).toBe('3');
  });

  it('round-trips a return path with its own query through login', () => {
    const next = `${routes.sessions.selected(1)}&${routeParams.toyIds}=2,3`;
    expect(parse(routes.login(next)).searchParams.get(routeParams.next)).toBe(next);
  });
});
