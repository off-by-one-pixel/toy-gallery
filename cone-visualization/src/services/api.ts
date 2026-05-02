import {
  toysSessionsCreate,
  toysSessionsDestroy,
  toysSessionsList,
  toysSessionsRetrieve,
  toysSessionsUpdate,
  toysTokenCreate,
  toysToysCreate,
  toysToysDestroy,
  toysToysExportRetrieve,
  toysToysImportCreate,
  toysToysList,
  toysToysPartialUpdate,
} from './generated/sdk';
import { API_CONFIG } from '../config';
import { camelToSnake, snakeToCamel } from '../utils/case';
import type {
  ExportEnvelopeRequest,
  PatchedToyRequest,
  SessionRequest as ApiSessionRequest,
  ToyRequest as ApiToyRequest,
} from './generated/schemas';
import { APIError, type Session, type SessionPayload, type TokenPair, type Toy, type ToyPayload } from './types';

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

// ---------- Toy CRUD ----------

export const fetchCones = async (): Promise<Toy[]> => {
  const { data } = await toysToysList();
  return data.map((t) => snakeToCamel<Toy>(t));
};

export const deleteToy = (id: number | string) => toysToysDestroy(Number(id));

export const createToy = (toy: ToyPayload) => toysToysCreate(camelToSnake<ApiToyRequest>(toy));

/**
 * The DRF serializer doesn't support in-place update of the nested shape, so
 * "edit" is implemented as create-new-then-delete-old. POST first so a
 * failure leaves the original intact.
 */
export const replaceToy = async (originalId: number, toy: ToyPayload) => {
  const created = await createToy(toy);
  await deleteToy(originalId);
  return created;
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
  const date = new Date().toISOString().slice(0, 10);
  triggerBrowserDownload(data, EXPORT_FILENAME(date));
};

export const importFromFile = async (file: File): Promise<{ created: number }> => {
  const text = await file.text();
  const envelope = JSON.parse(text) as ExportEnvelopeRequest;
  const { data } = await toysToysImportCreate(envelope);
  return data;
};

// ---------- Sessions ----------

export const fetchSessions = async (): Promise<Session[]> => {
  const { data } = await toysSessionsList();
  return data.map((s) => snakeToCamel<Session>(s));
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
