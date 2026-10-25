import {
  toysAppTokenCreate,
  toysAppTokenDestroy,
  toysAppTokenRetrieve,
  toysChangePasswordCreate,
  toysSessionsStatsRetrieve,
  toysSessionsCreate,
  toysSessionsDestroy,
  toysSessionsMediaStatusRetrieve,
  toysSessionsMediaLikeCreate,
  toysSessionsMediaRetrieve,
  toysSessionsRebuildRecordsCreate,
  toysSessionsRefreshMediaCreate,
  toysSessionsList,
  toysSessionsLiveRetrieve,
  toysSessionsStartCreate,
  toysSessionsPartialUpdate,
  toysSessionsRetrieve,
  toysSessionsUpdate,
  toysTokenCreate,
  toysToysAttributeSuggestionsList,
  toysToysCreate,
  toysToysDeleteAllDestroy,
  toysToysDestroy,
  toysToysExportRetrieve,
  toysToysImportCreate,
  toysToysList,
  toysToysPartialUpdate,
} from '@/api/generated/sdk';
import { localDateKey } from '@/lib/dates';
import { NO_SESSION_FILTERS, type SessionFilters, sessionFilterWireParams } from '@/features/sessions/session';
import { camelToSnake, snakeToCamel } from '@/api/case';
import type {
  ExportEnvelopeRequest,
  ToysSessionsListParams,
  PatchedToyRequest,
  SessionRequest as ApiSessionRequest,
  ToyRequest as ApiToyRequest,
} from '@/api/generated/schemas';
import {
  type AppToken,
  type AppTokenStatus,
  type AttributeSuggestion,
  type DeleteCollectionSummary,
  type ImportSummary,
  type MediaRefreshSummary,
  type MediaStatus,
  type StatsGroup,
  type Session,
  type SessionMedia,
  type SessionPayload,
  type TokenPair,
  type Toy,
  type ToyPayload,
} from '@/api/types';

const camel = <T>(response: Promise<unknown>): Promise<T> => response.then((data) => snakeToCamel<T>(data));

export const login = async (username: string, password: string): Promise<TokenPair> => {
  const { access, refresh } = await toysTokenCreate({ username, password });
  return { access, refresh };
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await toysChangePasswordCreate({ current_password: currentPassword, new_password: newPassword });
};

export const fetchAppTokenStatus = (): Promise<AppTokenStatus> => camel(toysAppTokenRetrieve());

export const createAppToken = (): Promise<AppToken> => camel(toysAppTokenCreate());

export const revokeAppToken = async (): Promise<void> => {
  await toysAppTokenDestroy();
};

export const fetchToys = (): Promise<Toy[]> => camel(toysToysList());

export const fetchAttributeSuggestions = (): Promise<AttributeSuggestion[]> => toysToysAttributeSuggestionsList();

export const deleteToy = async (id: number | string): Promise<void> => {
  await toysToysDestroy(Number(id));
};

export const createToy = (toy: ToyPayload): Promise<Toy> => camel(toysToysCreate(camelToSnake<ApiToyRequest>(toy)));

export const patchToy = (id: number, changes: Partial<ToyPayload>): Promise<Toy> =>
  camel(toysToysPartialUpdate(id, camelToSnake<PatchedToyRequest>(changes)));

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
  const data = await toysToysExportRetrieve();
  const date = localDateKey(new Date());
  triggerBrowserDownload(data, EXPORT_FILENAME(date));
};

export const importFromFile = async (file: File): Promise<ImportSummary> =>
  camel(toysToysImportCreate(JSON.parse(await file.text()) as ExportEnvelopeRequest));

export const deleteCollection = (): Promise<DeleteCollectionSummary> => camel(toysToysDeleteAllDestroy());

export type SessionPage = Readonly<{ sessions: Session[]; count: number; hasMore: boolean }>;

export const fetchSessions = async (
  opts: Readonly<{
    page?: number;
    start?: string;
    end?: string;
    ordering?: string;
    filters?: SessionFilters;
  }> = {},
): Promise<SessionPage> => {
  const filters = opts.filters ?? NO_SESSION_FILTERS;
  const { results, count, next } = await toysSessionsList({
    page: opts.page,
    start: opts.start,
    end: opts.end,
    ordering: opts.ordering as ToysSessionsListParams['ordering'],
    ...sessionFilterWireParams(filters),
    tz: browserTimeZone(),
  });
  return { sessions: snakeToCamel<Session[]>(results), count, hasMore: next != null };
};

export const fetchSession = (id: number): Promise<Session> => camel(toysSessionsRetrieve(id));

export const createSession = (payload: SessionPayload): Promise<Session> =>
  camel(toysSessionsCreate(camelToSnake<ApiSessionRequest>(payload)));

export const updateSession = (id: number, payload: SessionPayload): Promise<Session> =>
  camel(toysSessionsUpdate(id, camelToSnake<ApiSessionRequest>(payload)));

export const deleteSession = async (id: number): Promise<void> => {
  await toysSessionsDestroy(id);
};

export const patchSessionStart = (id: number, startedAt: string): Promise<Session> =>
  camel(toysSessionsPartialUpdate(id, { started_at: startedAt }));

export const startLiveSession = (): Promise<Session> => camel(toysSessionsStartCreate());

export const fetchLiveSession = async (): Promise<Session | null> => {
  const { session } = await toysSessionsLiveRetrieve();
  return session ? snakeToCamel<Session>(session) : null;
};

export const fetchMediaStatus = (): Promise<MediaStatus> => camel(toysSessionsMediaStatusRetrieve());

export const refreshAllSessionMedia = (): Promise<MediaRefreshSummary> => camel(toysSessionsRefreshMediaCreate());

export const rebuildRecords = async (): Promise<number> => (await toysSessionsRebuildRecordsCreate()).records;

export const fetchSessionMedia = (sessionId: number): Promise<SessionMedia> =>
  camel(toysSessionsMediaRetrieve(sessionId));

export const setMediaLiked = async (assetId: string, liked: boolean): Promise<boolean> =>
  (await toysSessionsMediaLikeCreate({ asset_id: assetId, liked })).liked;

const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const fetchSessionStats = async (
  groupBy: 'date' | 'hour' | 'weekday' | 'toy',
  metrics: readonly string[],
  opts: {
    start?: string;
    end?: string;
    filters?: SessionFilters;
  } = {},
): Promise<StatsGroup[]> => {
  const filters = opts.filters ?? NO_SESSION_FILTERS;
  const { groups } = await toysSessionsStatsRetrieve({
    group_by: groupBy,
    metrics: metrics.join(','),
    start: opts.start,
    end: opts.end,
    ...sessionFilterWireParams(filters),
    tz: browserTimeZone(),
  });
  return groups;
};
