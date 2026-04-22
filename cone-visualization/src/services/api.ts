import {
  toysTokenCreate,
  toysTokenRefreshCreate,
  toysToysCreate,
  toysToysDestroy,
  toysToysExportRetrieve,
  toysToysImportCreate,
  toysToysList,
} from './generated/sdk';
import { camelToSnake, snakeToCamel } from '../utils/case';
import type { ExportEnvelopeRequest, ToyRequest as ApiToyRequest } from './generated/schemas';
import type { TokenPair, Toy, ToyPayload } from './types';

export { setAuthContext } from './http';

// ---------- Token endpoints ----------

export const login = async (username: string, password: string): Promise<TokenPair> => {
  const { data } = await toysTokenCreate({ username, password });
  return { access: data.access, refresh: data.refresh };
};

export const refreshTokens = async (refresh: string): Promise<TokenPair> => {
  const { data } = await toysTokenRefreshCreate({ refresh });
  return { access: data.access, refresh: data.refresh ?? refresh };
};

// ---------- Toy CRUD ----------

export const fetchCones = async (): Promise<Toy[]> => {
  const { data } = await toysToysList();
  return data.map((t) => snakeToCamel<Toy>(t));
};

export const deleteToy = (id: number | string) => toysToysDestroy(Number(id));

export const createToy = (toy: ToyPayload) =>
  toysToysCreate(camelToSnake<ApiToyRequest>(toy));

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
