const SESSIONS = '/sessions';

export const routeParams = {
  next: 'next',
  sessionId: 'id',
  toyIds: 'toys',
} as const;

const withParam = (path: string, name: string, value: string | number) =>
  `${path}?${new URLSearchParams({ [name]: String(value) }).toString()}`;

export const routes = {
  home: '/',
  login: (next: string) => withParam('/login', routeParams.next, next),
  settings: '/settings',
  sessions: {
    list: SESSIONS,
    selected: (id: number) => withParam(SESSIONS, routeParams.sessionId, id),
    forToy: (toyId: number) => withParam(SESSIONS, routeParams.toyIds, toyId),
    new: `${SESSIONS}/new`,
    edit: (id: number) => withParam(`${SESSIONS}/edit`, routeParams.sessionId, id),
  },
};
