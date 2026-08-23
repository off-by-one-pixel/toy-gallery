import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { camelToSnake } from '@/api/case';
import { API_CONFIG } from '@/config';
import type { Session } from '@/api/types';

export { http, HttpResponse };

export const api = (path: string) => new URL(path, API_CONFIG.baseUrl).toString();

export const wire = (value: unknown): unknown => camelToSnake(value);

export const sessionPageWire = (
  sessions: readonly Session[],
  overrides: Partial<{ count: number; hasMore: boolean }> = {},
) => ({
  count: overrides.count ?? sessions.length,
  next: overrides.hasMore ? api('/toys/sessions/?page=2') : null,
  previous: null,
  results: sessions.map((s) => wire(s)),
});

export const liveWire = (session: Session | null) => ({ session: session ? wire(session) : null });

export const server = setupServer(
  http.get(api('/toys/toys/'), () => HttpResponse.json([])),
  http.get(api('/toys/sessions/'), () => HttpResponse.json(sessionPageWire([]))),
  http.get(api('/toys/sessions/live/'), () => HttpResponse.json({ session: null })),
  http.get(api('/toys/sessions/stats/'), () => HttpResponse.json({ groups: [] })),
  http.get(api('/toys/sessions/media-status/'), () => HttpResponse.json({ configured: false })),
  http.get(api('/toys/sessions/:id/media/'), () =>
    HttpResponse.json({ configured: false, share_url: null, items: [] }),
  ),
);

type CaptureMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type Captured = { urls: URL[]; bodies: unknown[] };

export const capture = (
  method: CaptureMethod,
  path: string,
  respond: (url: URL, index: number) => unknown = () => undefined,
): Captured => {
  const captured: Captured = { urls: [], bodies: [] };
  server.use(
    http[method](path, async ({ request }) => {
      const url = new URL(request.url);
      captured.urls.push(url);
      if (request.method !== 'GET') {
        const text = await request.clone().text();
        captured.bodies.push(text ? JSON.parse(text) : undefined);
      }
      const body = respond(url, captured.urls.length - 1);
      return body instanceof Response ? body : HttpResponse.json(body as never);
    }),
  );
  return captured;
};
