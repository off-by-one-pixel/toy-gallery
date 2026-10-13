const SESSIONS = '/sessions';

export const routes = {
  home: '/',
  login: (next: string) => `/login?next=${encodeURIComponent(next)}`,
  settings: '/settings',
  sessions: {
    list: SESSIONS,
    new: `${SESSIONS}/new`,
    edit: (id: number) => `${SESSIONS}/edit?id=${id}`,
  },
};
