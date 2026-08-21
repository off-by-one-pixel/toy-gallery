// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./index', () => ({
  refreshTokens: vi.fn(),
}));

vi.mock('@/config', () => ({
  API_CONFIG: { baseUrl: 'http://test.local' },
}));

import { refreshTokens } from './index';
import { customFetch, setSessionExpiredHandler, tokenStorage } from './http';
import { APIError } from './types';

const mockRefresh = vi.mocked(refreshTokens);
const fetchMock = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>();

/** Build a Response for the next fetch call. */
const respond = (body: unknown, init: ResponseInit = {}) => {
  const isString = typeof body === 'string' || body === undefined || body === null;
  const text = body === undefined ? '' : isString ? (body as string) : JSON.stringify(body);
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && !isString) headers.set('Content-Type', 'application/json');
  return new Response(text, { ...init, headers });
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  mockRefresh.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------- tokenStorage ----------

describe('tokenStorage', () => {
  it('round-trips access, refresh, and username', () => {
    tokenStorage.setTokens({ access: 'A', refresh: 'R' }, 'alice');
    expect(tokenStorage.getAccess()).toBe('A');
    expect(tokenStorage.getRefresh()).toBe('R');
    expect(tokenStorage.getUsername()).toBe('alice');
  });

  it('leaves username untouched when setTokens is called without one', () => {
    tokenStorage.setTokens({ access: 'A1', refresh: 'R1' }, 'alice');
    tokenStorage.setTokens({ access: 'A2', refresh: 'R2' });
    expect(tokenStorage.getAccess()).toBe('A2');
    expect(tokenStorage.getUsername()).toBe('alice');
  });

  it('clear() removes all three keys', () => {
    tokenStorage.setTokens({ access: 'A', refresh: 'R' }, 'alice');
    tokenStorage.clear();
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(tokenStorage.getUsername()).toBeNull();
  });
});

// ---------- customFetch — happy path + body shapes ----------

describe('customFetch — body parsing', () => {
  it('returns { data, status, headers } envelope on 200 with JSON body', async () => {
    fetchMock.mockResolvedValueOnce(respond({ hello: 'world' }, { status: 200 }));
    const out = await customFetch<{ data: { hello: string }; status: number; headers: Headers }>('/x', {});
    expect(out.data).toEqual({ hello: 'world' });
    expect(out.status).toBe(200);
    expect(out.headers).toBeInstanceOf(Headers);
  });

  it('returns data: undefined on 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const out = await customFetch<{ data: unknown }>('/x', {});
    expect(out.data).toBeUndefined();
  });

  it('returns data: undefined when the body is empty on a 2xx', async () => {
    fetchMock.mockResolvedValueOnce(respond('', { status: 200 }));
    const out = await customFetch<{ data: unknown }>('/x', {});
    expect(out.data).toBeUndefined();
  });

  it('returns the raw text when the body is not valid JSON', async () => {
    fetchMock.mockResolvedValueOnce(respond('not-json', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
    const out = await customFetch<{ data: unknown }>('/x', {});
    expect(out.data).toBe('not-json');
  });
});

// ---------- customFetch — error wrapping ----------

describe('customFetch — error wrapping', () => {
  it('uses body.detail when present', async () => {
    fetchMock.mockResolvedValueOnce(respond({ detail: 'Not found' }, { status: 404 }));
    await expect(customFetch('/x', {})).rejects.toMatchObject({ message: 'Not found', status: 404 });
  });

  it('falls back to body.message when detail is absent', async () => {
    fetchMock.mockResolvedValueOnce(respond({ message: 'Bad request' }, { status: 400 }));
    await expect(customFetch('/x', {})).rejects.toMatchObject({ message: 'Bad request', status: 400 });
  });

  it('falls back to "API request failed" when neither detail nor message are strings', async () => {
    fetchMock.mockResolvedValueOnce(respond({ field: ['Required'] }, { status: 400 }));
    const err = await customFetch('/x', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).message).toBe('API request failed');
    expect((err as APIError).data).toEqual({ field: ['Required'] });
  });

  it('uses "Server error (N)" when the body is a non-object', async () => {
    fetchMock.mockResolvedValueOnce(
      respond('plain string', { status: 500, headers: { 'Content-Type': 'text/plain' } }),
    );
    await expect(customFetch('/x', {})).rejects.toMatchObject({
      message: 'Server error (500)',
      status: 500,
      data: null,
    });
  });

  it('uses "Server error (N)" when the body is JSON null', async () => {
    fetchMock.mockResolvedValueOnce(respond(null, { status: 500, headers: { 'Content-Type': 'application/json' } }));
    await expect(customFetch('/x', {})).rejects.toMatchObject({
      message: 'Server error (500)',
      status: 500,
    });
  });
});

// ---------- customFetch — Bearer attach ----------

describe('customFetch — Bearer header', () => {
  it('attaches Authorization: Bearer <token> when an access token is stored', async () => {
    tokenStorage.setTokens({ access: 'TOK', refresh: 'R' });
    fetchMock.mockResolvedValueOnce(respond({}, { status: 200 }));

    await customFetch('/x', { method: 'GET' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer TOK');
  });

  it('omits Authorization when no token is stored', async () => {
    fetchMock.mockResolvedValueOnce(respond({}, { status: 200 }));

    await customFetch('/x', { method: 'GET' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers && new Headers(init.headers).get('Authorization')).toBeFalsy();
  });
});

// ---------- customFetch — network failure ----------

describe('customFetch — network failure', () => {
  it('wraps a thrown fetch into APIError("Network error", 0, cause)', async () => {
    const cause = new TypeError('connect ECONNREFUSED');
    fetchMock.mockRejectedValueOnce(cause);

    const err = await customFetch('/x', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).message).toBe('Network error');
    expect((err as APIError).status).toBe(0);
    expect((err as APIError).data).toBe(cause);
  });
});

// ---------- customFetch — 401 → refresh → retry ----------

describe('customFetch — 401 refresh flow', () => {
  it('refreshes once and retries the request with the new bearer when refresh succeeds', async () => {
    tokenStorage.setTokens({ access: 'OLD', refresh: 'R1' });
    fetchMock.mockResolvedValueOnce(respond({ detail: 'expired' }, { status: 401 }));
    mockRefresh.mockResolvedValueOnce({ access: 'NEW', refresh: 'R2' });
    fetchMock.mockResolvedValueOnce(respond({ ok: true }, { status: 200 }));

    const out = await customFetch<{ data: { ok: boolean } }>('/x', { method: 'GET' });

    expect(out.data).toEqual({ ok: true });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledWith('R1');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const retryInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(retryInit.headers).get('Authorization')).toBe('Bearer NEW');
    // Tokens were persisted from the refresh response.
    expect(tokenStorage.getAccess()).toBe('NEW');
    expect(tokenStorage.getRefresh()).toBe('R2');
  });

  it('does not retry and surfaces the 401 when no refresh token is stored', async () => {
    fetchMock.mockResolvedValueOnce(respond({ detail: 'expired' }, { status: 401 }));

    await expect(customFetch('/x', {})).rejects.toMatchObject({ message: 'expired', status: 401 });
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears tokens and surfaces the 401 when refresh fails', async () => {
    tokenStorage.setTokens({ access: 'OLD', refresh: 'R1' }, 'alice');
    fetchMock.mockResolvedValueOnce(respond({ detail: 'expired' }, { status: 401 }));
    mockRefresh.mockRejectedValueOnce(new Error('refresh failed'));

    // The console.warn is intentional from the prod path; silence it for the test.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(customFetch('/x', {})).rejects.toMatchObject({ message: 'expired', status: 401 });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(tokenStorage.getUsername()).toBeNull();

    warnSpy.mockRestore();
  });

  it('notifies the session-expired handler when refresh fails', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    tokenStorage.setTokens({ access: 'OLD', refresh: 'R1' }, 'alice');
    fetchMock.mockResolvedValueOnce(respond({ detail: 'expired' }, { status: 401 }));
    mockRefresh.mockRejectedValueOnce(new Error('refresh failed'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(customFetch('/x', {})).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    setSessionExpiredHandler(null);
  });

  it('notifies the session-expired handler on a 401 with no refresh token stored', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    fetchMock.mockResolvedValueOnce(respond({ detail: 'expired' }, { status: 401 }));

    await expect(customFetch('/x', {})).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();

    setSessionExpiredHandler(null);
  });
});
