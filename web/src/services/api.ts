import {
  toysChangePasswordCreate,
  toysSessionsStatsRetrieve,
  toysSessionsCreate,
  toysSessionsDestroy,
  toysSessionsMediaIndicatorsRetrieve,
  toysSessionsMediaRetrieve,
  toysSessionsRefreshMediaCreate,
  toysSessionsList,
  toysSessionsLiveRetrieve,
  toysSessionsStartCreate,
  toysSessionsRetrieve,
  toysSessionsUpdate,
  toysTokenCreate,
  toysToysCreate,
  toysToysDeleteAllDestroy,
  toysToysDestroy,
  toysToysExportRetrieve,
  toysToysImportCreate,
  toysToysList,
  toysToysPartialUpdate,
} from './generated/sdk';
import { API_CONFIG } from '../config';
import { localDateKey } from './dates';
import { camelToSnake, snakeToCamel } from '../utils/case';
import type {
  ExportEnvelopeRequest,
  ToysSessionsListParams,
  PatchedToyRequest,
  SessionRequest as ApiSessionRequest,
  ToyRequest as ApiToyRequest,
} from './generated/schemas';
import {
  APIError,
  type StatsGroup,
  type Session,
  type SessionMedia,
  type SessionMediaItem,
  type SessionPayload,
  type TokenPair,
  type Toy,
  type ToyPayload,
} from './types';

// ---------- Token endpoints ----------

export const login = async (username: string, password: string): Promise<TokenPair> => {
  const { data } = await toysTokenCreate({ username, password });
  return { access: data.access, refresh: data.refresh };
};

/**
 * POST /toys/token/refresh/ via bare fetch — deliberately bypasses the
 * generated SDK so the call itself can't re-enter the mutator's 401
 * retry loop.
 */
export const refreshTokens = async (refresh: string): Promise<TokenPair> => {
  const response = await fetch(new URL('/toys/token/refresh/', API_CONFIG.baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    throw new APIError(`Refresh failed: ${response.status}`, response.status, null);
  }
  const data = (await response.json()) as Partial<TokenPair>;
  if (!data.access) {
    throw new APIError('Refresh response missing access token', response.status, data);
  }
  return { access: data.access, refresh: data.refresh ?? refresh };
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await toysChangePasswordCreate({ current_password: currentPassword, new_password: newPassword });
};

// ---------- Toy CRUD ----------

export const fetchToys = async (): Promise<Toy[]> => {
  const { data } = await toysToysList();
  return data.map((t) => snakeToCamel<Toy>(t));
};

export const deleteToy = async (id: number | string): Promise<void> => {
  await toysToysDestroy(Number(id));
};

export const createToy = async (toy: ToyPayload): Promise<Toy> => {
  const { data } = await toysToysCreate(camelToSnake<ApiToyRequest>(toy));
  return snakeToCamel<Toy>(data);
};

export const patchToy = async (id: number, changes: Partial<ToyPayload>): Promise<Toy> => {
  const { data } = await toysToysPartialUpdate(id, camelToSnake<PatchedToyRequest>(changes));
  return snakeToCamel<Toy>(data);
};

const triggerBrowserDownload = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const EXPORT_FILENAME = (date: string) => `toy-gallery-${date}.json`;

export const downloadExport = async (): Promise<void> => {
  const { data } = await toysToysExportRetrieve();
  const date = localDateKey(new Date());
  triggerBrowserDownload(data, EXPORT_FILENAME(date));
};

export const importFromFile = async (file: File): Promise<{ toys_created: number; sessions_created: number }> => {
  const text = await file.text();
  const envelope = JSON.parse(text) as ExportEnvelopeRequest;
  const { data } = await toysToysImportCreate(envelope);
  return data;
};

export const deleteCollection = async (): Promise<{
  toys_deleted: number;
  sessions_deleted: number;
}> => {
  const { data } = await toysToysDeleteAllDestroy();
  return data;
};

// ---------- Sessions ----------

export type SessionPage = Readonly<{ sessions: Session[]; count: number; hasMore: boolean }>;

export const fetchSessions = async (
  opts: Readonly<{ page?: number; start?: string; ordering?: string }> = {},
): Promise<SessionPage> => {
  const { data } = await toysSessionsList({
    page: opts.page,
    start: opts.start,
    ordering: opts.ordering as ToysSessionsListParams['ordering'],
    tz: browserTimeZone(),
  });
  return {
    sessions: data.results.map((s) => snakeToCamel<Session>(s)),
    count: data.count,
    hasMore: data.next != null,
  };
};

export const fetchSession = async (id: number): Promise<Session> => {
  const { data } = await toysSessionsRetrieve(id);
  return snakeToCamel<Session>(data);
};

export const createSession = async (payload: SessionPayload): Promise<Session> => {
  const { data } = await toysSessionsCreate(camelToSnake<ApiSessionRequest>(payload));
  return snakeToCamel<Session>(data);
};

export const updateSession = async (id: number, payload: SessionPayload): Promise<Session> => {
  const { data } = await toysSessionsUpdate(id, camelToSnake<ApiSessionRequest>(payload));
  return snakeToCamel<Session>(data);
};

export const deleteSession = (id: number) => toysSessionsDestroy(id);

export const startLiveSession = async (): Promise<Session> => {
  const { data } = await toysSessionsStartCreate();
  return snakeToCamel<Session>(data);
};

export const fetchLiveSession = async (): Promise<Session | null> => {
  const { data } = await toysSessionsLiveRetrieve();
  return data.session ? snakeToCamel<Session>(data.session) : null;
};

export const MEDIA_INDICATORS_CHANGED_EVENT = 'mediaIndicatorsChanged';
export const SESSIONS_CHANGED_EVENT = 'sessionsChanged';

export const notifySessionsChanged = (): void => {
  window.dispatchEvent(new Event(SESSIONS_CHANGED_EVENT));
};

export type MediaIndicators = { configured: boolean; sessionIds: Set<number> };

export const fetchMediaIndicators = async (): Promise<MediaIndicators> => {
  const { data } = await toysSessionsMediaIndicatorsRetrieve();
  return { configured: data.configured, sessionIds: new Set(data.session_ids) };
};

export const refreshAllSessionMedia = async (): Promise<MediaIndicators> => {
  const { data } = await toysSessionsRefreshMediaCreate();
  return { configured: data.configured, sessionIds: new Set(data.session_ids) };
};

export const fetchSessionMedia = async (sessionId: number): Promise<SessionMedia> => {
  const { data } = await toysSessionsMediaRetrieve(sessionId);
  return {
    configured: data.configured,
    items: data.items.map((i) => snakeToCamel<SessionMediaItem>(i)),
  };
};

export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const fetchSessionStats = async (
  groupBy: 'date' | 'hour' | 'weekday',
  metrics: readonly string[],
  opts: { start?: string; end?: string } = {},
): Promise<StatsGroup[]> => {
  const { data } = await toysSessionsStatsRetrieve({
    group_by: groupBy,
    metrics: metrics.join(','),
    start: opts.start,
    end: opts.end,
    tz: browserTimeZone(),
  });
  return data.groups;
};
